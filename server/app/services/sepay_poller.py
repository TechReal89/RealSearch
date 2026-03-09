"""SePay Poller - Background task to poll SePay API and auto-confirm payments."""
import asyncio
import logging
import re

import httpx
from sqlalchemy import select

from app.database import async_session
from app.models.payment import Payment, PaymentChannel
from app.services.payment_service import _complete_payment

logger = logging.getLogger(__name__)

SEPAY_API_URL = "https://my.sepay.vn/userapi/transactions/list"
POLL_INTERVAL = 30  # seconds


class SepayPoller:
    def __init__(self):
        self._running = False
        self._last_transaction_id: str | None = None

    async def poll_once(self):
        """Poll SePay API for new transactions and match with pending payments."""
        async with async_session() as db:
            # Get SePay channel config
            result = await db.execute(
                select(PaymentChannel).where(PaymentChannel.name == "sepay")
            )
            channel = result.scalar_one_or_none()
            if not channel or not channel.is_active or not channel.config:
                return

            api_key = channel.config.get("api_key", "")
            if not api_key:
                return

            # Check if there are any pending payments
            pending_result = await db.execute(
                select(Payment).where(
                    Payment.status == "pending",
                    Payment.channel_id == channel.id,
                )
            )
            pending_payments = pending_result.scalars().all()
            if not pending_payments:
                return

            # Build a map of transaction_id -> payment for quick lookup
            pending_map: dict[str, Payment] = {}
            for p in pending_payments:
                if p.transaction_id:
                    pending_map[p.transaction_id] = p

            if not pending_map:
                return

        # Fetch recent transactions from SePay API
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    SEPAY_API_URL,
                    headers={"Authorization": f"Bearer {api_key}"},
                    params={"limit": 20},
                )
                if resp.status_code != 200:
                    logger.warning(f"SePay API returned {resp.status_code}")
                    return

                data = resp.json()
                transactions = data.get("transactions", [])
        except Exception as e:
            logger.error(f"SePay API error: {e}")
            return

        if not transactions:
            return

        # Process each transaction
        matched = 0
        async with async_session() as db:
            # Re-fetch pending payments within this session
            pending_result = await db.execute(
                select(Payment).where(
                    Payment.status == "pending",
                    Payment.channel_id == channel.id,
                )
            )
            pending_payments = pending_result.scalars().all()
            pending_map = {p.transaction_id: p for p in pending_payments if p.transaction_id}

            for txn in transactions:
                amount_in = float(txn.get("amount_in", 0))
                if amount_in <= 0:
                    continue

                content = txn.get("transaction_content", "")

                # Extract RS-XXXXXXXXXXXX from transaction content
                # Ngân hàng có thể bỏ dấu - nên cần match cả RSxxxxxxxx
                upper_content = content.upper()
                match = re.search(r"RS-([A-Z0-9]{12})", upper_content)
                if not match:
                    match = re.search(r"RS([A-Z0-9]{12})", upper_content)
                    if not match:
                        continue
                    transaction_id = f"RS-{match.group(1)}"
                else:
                    transaction_id = match.group(0)

                # Check if this matches a pending payment
                payment = pending_map.get(transaction_id)
                if not payment:
                    continue

                # Verify amount
                if abs(float(payment.amount) - amount_in) > 1:
                    logger.warning(
                        f"SePay poller: amount mismatch for {transaction_id} "
                        f"- expected {payment.amount}, got {amount_in}"
                    )
                    continue

                # Complete the payment
                payment.payment_ref = txn.get("reference_number", "")
                result = await _complete_payment(db, payment, "SePay-Poller")

                if result.get("success"):
                    matched += 1
                    logger.info(
                        f"SePay poller: auto-confirmed payment {transaction_id}, "
                        f"amount={amount_in}"
                    )
                    # Send WebSocket notification to user
                    try:
                        from app.ws.manager import manager
                        await manager.send_to_user(payment.user_id, {
                            "type": "payment_completed",
                            "payment_id": payment.id,
                            "amount": float(payment.amount),
                            "credit_amount": payment.credit_amount or 0,
                            "bonus_credit": payment.bonus_credit or 0,
                            "purpose": payment.purpose,
                        })
                    except Exception as e:
                        logger.warning(f"Failed to send WS notification: {e}")
                    # Remove from map so we don't process again
                    del pending_map[transaction_id]

            if matched > 0:
                await db.commit()
                logger.info(f"SePay poller: confirmed {matched} payment(s)")

    async def start_polling(self):
        """Background loop that polls SePay API."""
        self._running = True
        logger.info("SePay poller started")

        while self._running:
            try:
                await self.poll_once()
            except Exception as e:
                logger.error(f"SePay poller error: {e}")

            await asyncio.sleep(POLL_INTERVAL)

    def stop(self):
        self._running = False
        logger.info("SePay poller stopped")


# Singleton
sepay_poller = SepayPoller()
