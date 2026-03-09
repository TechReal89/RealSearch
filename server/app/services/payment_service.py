"""Payment service - xử lý thanh toán SePay webhook + Bank Transfer."""
import hashlib
import hmac
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credit import CreditTransaction, CreditType
from app.models.payment import Payment, PaymentChannel
from app.models.user import User

logger = logging.getLogger(__name__)


async def process_sepay_webhook(
    db: AsyncSession,
    data: dict,
    api_key: str,
) -> dict:
    """
    Xử lý SePay webhook khi nhận được chuyển khoản.

    SePay gửi webhook với format:
    {
        "gateway": "MBBank",
        "transactionDate": "2024-01-15 10:30:00",
        "accountNumber": "0123456789",
        "subAccount": null,
        "transferType": "in",
        "transferAmount": 100000,
        "accumulated": 5000000,
        "code": null,
        "content": "RS-ABC123DEF456 nap tien",
        "referenceCode": "FT24015...",
        "description": "...",
    }
    """
    content = data.get("content", "")
    amount = data.get("transferAmount", 0)
    transfer_type = data.get("transferType", "")

    # Chỉ xử lý giao dịch nhận tiền
    if transfer_type != "in":
        return {"success": False, "reason": "Not incoming transfer"}

    if amount <= 0:
        return {"success": False, "reason": "Invalid amount"}

    # Tìm mã giao dịch trong nội dung chuyển khoản
    # Format: RS-XXXXXXXXXXXX
    transaction_id = _extract_transaction_id(content)
    if not transaction_id:
        logger.warning(f"SePay webhook: không tìm thấy mã GD trong '{content}'")
        return {"success": False, "reason": "Transaction ID not found in content"}

    # Tìm payment pending
    result = await db.execute(
        select(Payment).where(
            Payment.transaction_id == transaction_id,
            Payment.status == "pending",
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        logger.warning(f"SePay webhook: không tìm thấy payment {transaction_id}")
        return {"success": False, "reason": f"Payment {transaction_id} not found or already processed"}

    # Kiểm tra số tiền
    if abs(float(payment.amount) - amount) > 1:
        logger.warning(
            f"SePay webhook: sai số tiền - cần {payment.amount}, nhận {amount}"
        )
        return {"success": False, "reason": "Amount mismatch"}

    # Xác nhận payment
    payment.status = "completed"
    payment.completed_at = datetime.now(timezone.utc)
    payment.payment_ref = data.get("referenceCode", "")

    # Cộng credit cho user
    if payment.credit_amount:
        user = await db.get(User, payment.user_id)
        if user:
            total_credit = payment.credit_amount + payment.bonus_credit
            user.credit_balance += total_credit
            user.total_earned += total_credit

            txn = CreditTransaction(
                user_id=user.id,
                type=CreditType.PURCHASE,
                amount=total_credit,
                balance_after=user.credit_balance,
                description=f"Nạp {payment.credit_amount} + {payment.bonus_credit} bonus credits (SePay)",
                reference_type="payment",
                reference_id=payment.id,
            )
            db.add(txn)
            logger.info(
                f"SePay: Xác nhận payment #{payment.id} cho user #{user.id}, "
                f"+{total_credit} credits, balance={user.credit_balance}"
            )

    await db.commit()
    return {"success": True, "payment_id": payment.id}


def _extract_transaction_id(content: str) -> str | None:
    """Trích mã giao dịch RS-XXXXXXXXXXXX từ nội dung chuyển khoản."""
    import re
    match = re.search(r"RS-[A-Z0-9]{12}", content.upper())
    if match:
        return match.group(0)
    return None


def generate_bank_transfer_info(payment: Payment, channel_config: dict) -> dict:
    """Tạo thông tin chuyển khoản ngân hàng cho user."""
    return {
        "bank_name": channel_config.get("bank_name", ""),
        "account_number": channel_config.get("account_number", ""),
        "account_name": channel_config.get("account_name", ""),
        "branch": channel_config.get("branch", ""),
        "amount": float(payment.amount),
        "content": payment.transaction_id,
        "note": f"Chuyển khoản đúng số tiền {int(payment.amount):,} VND với nội dung: {payment.transaction_id}",
    }
