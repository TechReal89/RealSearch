"""Background job: auto-downgrade expired tier subscriptions to bronze."""
import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select, update

from app.database import async_session
from app.models.user import MembershipTier, User

logger = logging.getLogger(__name__)


class TierExpiryChecker:
    def __init__(self):
        self._running = False
        self._interval = 300  # Check every 5 minutes

    async def start(self):
        self._running = True
        logger.info("Tier expiry checker started (interval=%ds)", self._interval)
        while self._running:
            try:
                await self._check_expired()
            except Exception as e:
                logger.error("Tier expiry check error: %s", e)
            await asyncio.sleep(self._interval)

    async def _check_expired(self):
        now = datetime.now(timezone.utc)
        async with async_session() as db:
            result = await db.execute(
                select(User).where(
                    User.tier != MembershipTier.BRONZE,
                    User.tier_expires.isnot(None),
                    User.tier_expires < now,
                )
            )
            expired_users = result.scalars().all()

            if not expired_users:
                return

            for user in expired_users:
                old_tier = user.tier.value
                user.tier = MembershipTier.BRONZE
                user.tier_expires = None
                logger.info(
                    "User #%d (%s): tier %s expired, downgraded to bronze",
                    user.id, user.username, old_tier,
                )

            await db.commit()
            logger.info("Downgraded %d expired tier(s)", len(expired_users))

    def stop(self):
        self._running = False


tier_expiry_checker = TierExpiryChecker()
