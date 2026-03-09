"""Job Dispatcher - distributes tasks to connected clients based on priority."""
import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.credit import CreditTransaction, CreditType
from app.models.job import Job, JobStatus
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.ws.manager import ClientConnection, manager

logger = logging.getLogger(__name__)


class JobDispatcher:
    """Dispatches jobs to available clients based on priority scoring."""

    def __init__(self):
        self._running = False
        self._dispatch_interval = 5  # seconds

    def _calculate_priority_score(self, job: Job, tier_priority: int = 1) -> float:
        completion_ratio = (
            job.completed_count / job.target_count if job.target_count > 0 else 0
        )
        hours_since_update = (
            datetime.now(timezone.utc) - job.updated_at
        ).total_seconds() / 3600

        score = (
            job.priority * 10
            + tier_priority * 5
            + job.admin_priority * 8
            + (1 - completion_ratio) * 30
            + min(hours_since_update * 2, 20)
        )
        return score

    async def dispatch_once(self):
        """Run one dispatch cycle - find active jobs and assign to available clients."""
        available_clients = manager.get_available_clients()
        if not available_clients:
            return 0

        assigned_count = 0

        async with async_session() as db:
            # Get active jobs ordered by priority
            result = await db.execute(
                select(Job)
                .where(
                    Job.status == JobStatus.ACTIVE,
                    Job.completed_count < Job.target_count,
                )
                .order_by(
                    (Job.admin_priority + Job.priority).desc(),
                    Job.completed_count.asc(),
                )
                .limit(50)
            )
            active_jobs = result.scalars().all()

            if not active_jobs:
                return 0

            # Score and sort jobs
            scored_jobs = []
            for job in active_jobs:
                # Get user tier priority
                user = await db.get(User, job.user_id)
                tier_map = {"bronze": 1, "silver": 3, "gold": 6, "diamond": 10}
                tier_priority = tier_map.get(user.tier.value, 1) if user else 1
                score = self._calculate_priority_score(job, tier_priority)
                scored_jobs.append((score, job))

            scored_jobs.sort(key=lambda x: x[0], reverse=True)

            # Assign tasks to available clients
            for client in available_clients:
                for score, job in scored_jobs:
                    # Check if client supports this job type
                    if job.job_type.value not in client.enabled_job_types:
                        continue

                    # Check daily limit
                    if job.daily_limit and job.today_count >= job.daily_limit:
                        continue

                    # Check budget
                    if (
                        job.total_credit_budget
                        and job.credit_spent >= job.total_credit_budget
                    ):
                        continue

                    # Don't assign same job owner's job to their own client
                    if job.user_id == client.user_id:
                        continue

                    # Create task
                    task = Task(
                        job_id=job.id,
                        assigned_to=client.user_id,
                        client_session_id=client.session_id,
                        status=TaskStatus.ASSIGNED,
                        started_at=datetime.now(timezone.utc),
                    )
                    db.add(task)
                    await db.flush()

                    # Send task to client
                    task_message = {
                        "type": "task_assign",
                        "data": {
                            "task_id": task.id,
                            "job_type": job.job_type.value,
                            "config": {
                                "target_url": job.target_url,
                                **job.config,
                            },
                            "priority": score,
                            "timeout": 300,
                        },
                    }

                    try:
                        await client.send(task_message)
                        client.active_tasks.add(task.id)
                        assigned_count += 1
                        logger.info(
                            f"Task #{task.id} (job #{job.id}) assigned to "
                            f"session {client.session_id}"
                        )
                        break  # Move to next client
                    except Exception as e:
                        task.status = TaskStatus.FAILED
                        task.error_message = f"Send failed: {e}"
                        logger.warning(f"Failed to send task to {client.session_id}: {e}")

            await db.commit()

        return assigned_count

    async def handle_task_completed(
        self, session_id: str, task_id: int, result_data: dict
    ):
        """Handle task completion from client."""
        client = manager.get_client(session_id)

        async with async_session() as db:
            task = await db.get(Task, task_id)
            if not task or task.client_session_id != session_id:
                return

            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now(timezone.utc)
            task.result_data = result_data
            if task.started_at:
                task.time_spent = int(
                    (task.completed_at - task.started_at).total_seconds()
                )

            # Update job progress
            job = await db.get(Job, task.job_id)
            if job:
                job.completed_count += 1
                job.today_count += 1
                job.credit_spent += job.credit_per_view

                # Check if job is completed
                if job.completed_count >= job.target_count:
                    job.status = JobStatus.COMPLETED

            # Credit the worker
            if task.assigned_to:
                worker = await db.get(User, task.assigned_to)
                if worker and job:
                    # Apply tier multiplier
                    tier_multiplier = {
                        "bronze": 1.0, "silver": 1.2, "gold": 1.5, "diamond": 2.0
                    }
                    multiplier = tier_multiplier.get(worker.tier.value, 1.0)
                    credits = int(job.credit_per_view * multiplier)

                    worker.credit_balance += credits
                    worker.total_earned += credits
                    task.credits_earned = credits

                    # Credit transaction
                    txn = CreditTransaction(
                        user_id=worker.id,
                        type=CreditType.EARN_TASK,
                        amount=credits,
                        balance_after=worker.credit_balance,
                        description=f"Task #{task.id} completed ({job.job_type.value})",
                        reference_type="task",
                        reference_id=task.id,
                    )
                    db.add(txn)

                    # Notify worker of credit update
                    await manager.send_to_user(worker.id, {
                        "type": "credit_update",
                        "data": {
                            "balance": worker.credit_balance,
                            "earned": credits,
                            "reason": f"Task #{task.id} completed",
                        },
                    })

                    # Deferred referral bonus: award referrer after referred user completes 10 tasks
                    await self._check_referral_bonus(db, worker)

            await db.commit()

        # Update client state
        if client:
            client.active_tasks.discard(task_id)
            client.tasks_completed += 1
            client.credits_earned += task.credits_earned if task else 0

    async def _check_referral_bonus(self, db: AsyncSession, worker: User):
        """Award referral bonus to referrer after referred user completes 10 tasks."""
        if not worker.referred_by:
            return

        try:
            # Count completed tasks by this worker
            completed_count = (await db.execute(
                select(func.count()).select_from(Task).where(
                    Task.assigned_to == worker.id,
                    Task.status == TaskStatus.COMPLETED,
                )
            )).scalar() or 0

            if completed_count < 10:
                return

            # Check if referral bonus already awarded
            existing = (await db.execute(
                select(func.count()).select_from(CreditTransaction).where(
                    CreditTransaction.user_id == worker.referred_by,
                    CreditTransaction.type == CreditType.REFERRAL,
                    CreditTransaction.reference_id == worker.id,
                    CreditTransaction.reference_type == "referral",
                )
            )).scalar() or 0

            if existing > 0:
                return

            # Award bonus to referrer
            referrer = await db.get(User, worker.referred_by)
            if not referrer:
                return

            bonus = 50
            referrer.credit_balance += bonus
            referrer.total_earned += bonus
            txn = CreditTransaction(
                user_id=referrer.id,
                type=CreditType.REFERRAL,
                amount=bonus,
                balance_after=referrer.credit_balance,
                description=f"Giới thiệu thành công: {worker.username} (đã hoàn thành 10 tasks)",
                reference_type="referral",
                reference_id=worker.id,
            )
            db.add(txn)

            logger.info(
                f"Referral bonus: +{bonus} credits to user #{referrer.id} "
                f"for referring user #{worker.id} ({worker.username})"
            )

            # Notify referrer
            await manager.send_to_user(referrer.id, {
                "type": "credit_update",
                "data": {
                    "balance": referrer.credit_balance,
                    "earned": bonus,
                    "reason": f"Thưởng giới thiệu: {worker.username}",
                },
            })
        except Exception as e:
            logger.error(f"Error checking referral bonus: {e}")

    async def handle_task_failed(
        self, session_id: str, task_id: int, error_code: str, error_message: str
    ):
        """Handle task failure from client."""
        client = manager.get_client(session_id)

        async with async_session() as db:
            task = await db.get(Task, task_id)
            if not task or task.client_session_id != session_id:
                return

            task.retry_count += 1
            if task.retry_count >= task.max_retries:
                task.status = TaskStatus.FAILED
                task.error_message = f"{error_code}: {error_message}"
            else:
                # Reset for retry
                task.status = TaskStatus.PENDING
                task.assigned_to = None
                task.client_session_id = None

            task.completed_at = datetime.now(timezone.utc)
            await db.commit()

        if client:
            client.active_tasks.discard(task_id)
            client.tasks_failed += 1

    async def handle_task_rejected(self, session_id: str, task_id: int, reason: str):
        """Handle task rejection from client."""
        client = manager.get_client(session_id)

        async with async_session() as db:
            task = await db.get(Task, task_id)
            if not task:
                return

            # Reset task for reassignment
            task.status = TaskStatus.PENDING
            task.assigned_to = None
            task.client_session_id = None
            await db.commit()

        if client:
            client.active_tasks.discard(task_id)

    async def start_dispatch_loop(self):
        """Background loop that continuously dispatches tasks."""
        self._running = True
        logger.info("Job dispatcher started")

        while self._running:
            try:
                assigned = await self.dispatch_once()
                if assigned > 0:
                    logger.info(f"Dispatched {assigned} tasks")
            except Exception as e:
                logger.error(f"Dispatch error: {e}")

            await asyncio.sleep(self._dispatch_interval)

    def stop(self):
        self._running = False
        logger.info("Job dispatcher stopped")


# Singleton
dispatcher = JobDispatcher()
