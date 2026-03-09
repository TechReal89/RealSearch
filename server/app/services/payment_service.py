"""Payment service - xử lý thanh toán SePay/MoMo webhook + Bank Transfer + Tier upgrade."""
import hashlib
import hmac
import logging
import re
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credit import CreditTransaction, CreditType
from app.models.payment import Payment, PaymentChannel
from app.models.tier import MembershipTierConfig
from app.models.user import MembershipTier, User

logger = logging.getLogger(__name__)


async def _complete_payment(db: AsyncSession, payment: Payment, source: str) -> dict:
    """
    Complete a payment: add credits + upgrade tier as needed.
    Shared logic for SePay, MoMo, and admin confirm.
    """
    payment.status = "completed"
    payment.completed_at = datetime.now(timezone.utc)

    user = await db.get(User, payment.user_id)
    if not user:
        return {"success": False, "reason": "User not found"}

    # 1) Cộng credit nếu mua credit
    if payment.credit_amount:
        total_credit = payment.credit_amount + payment.bonus_credit
        user.credit_balance += total_credit
        user.total_earned += total_credit

        txn = CreditTransaction(
            user_id=user.id,
            type=CreditType.PURCHASE,
            amount=total_credit,
            balance_after=user.credit_balance,
            description=f"Nạp {payment.credit_amount} + {payment.bonus_credit} bonus credits ({source})",
            reference_type="payment",
            reference_id=payment.id,
        )
        db.add(txn)
        logger.info(
            f"{source}: +{total_credit} credits cho user #{user.id}, "
            f"balance={user.credit_balance}"
        )

    # 2) Nâng cấp tier nếu mua tier
    if payment.purpose in ("buy_tier", "buy_both") and payment.tier_id:
        tier_config = await db.get(MembershipTierConfig, payment.tier_id)
        if tier_config:
            old_tier = user.tier.value
            new_tier_name = tier_config.name

            # Map tier name to enum
            tier_map = {
                "bronze": MembershipTier.BRONZE,
                "silver": MembershipTier.SILVER,
                "gold": MembershipTier.GOLD,
                "diamond": MembershipTier.DIAMOND,
            }
            new_tier_enum = tier_map.get(new_tier_name)
            if new_tier_enum:
                user.tier = new_tier_enum

                # Calculate expiry: extend from current expiry if still valid, else from now
                duration_months = payment.tier_duration or 1
                now = datetime.now(timezone.utc)
                base_date = (
                    user.tier_expires
                    if user.tier_expires and user.tier_expires > now
                    else now
                )
                user.tier_expires = base_date + relativedelta(months=duration_months)

                logger.info(
                    f"{source}: User #{user.id} tier {old_tier} -> {new_tier_name}, "
                    f"expires {user.tier_expires.isoformat()}"
                )

    return {"success": True, "payment_id": payment.id}


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

    payment.payment_ref = data.get("referenceCode", "")
    result = await _complete_payment(db, payment, "SePay")

    await db.commit()
    return result


async def process_momo_webhook(
    db: AsyncSession,
    data: dict,
    secret_key: str,
) -> dict:
    """
    Xử lý MoMo IPN (Instant Payment Notification) webhook.

    MoMo gửi IPN với format:
    {
        "partnerCode": "MOMO...",
        "orderId": "RS-ABC123DEF456",
        "requestId": "...",
        "amount": 100000,
        "orderInfo": "Thanh toan RealSearch",
        "orderType": "momo_wallet",
        "transId": 123456789,
        "resultCode": 0,          # 0 = success
        "message": "Thành công",
        "payType": "qr",
        "responseTime": 1705312200000,
        "extraData": "",
        "signature": "..."
    }
    """
    order_id = data.get("orderId", "")
    amount = data.get("amount", 0)
    result_code = data.get("resultCode")
    trans_id = data.get("transId", "")
    signature = data.get("signature", "")

    # Verify signature
    if secret_key:
        raw_signature = (
            f"accessKey={data.get('accessKey', '')}"
            f"&amount={amount}"
            f"&extraData={data.get('extraData', '')}"
            f"&message={data.get('message', '')}"
            f"&orderId={order_id}"
            f"&orderInfo={data.get('orderInfo', '')}"
            f"&orderType={data.get('orderType', '')}"
            f"&partnerCode={data.get('partnerCode', '')}"
            f"&payType={data.get('payType', '')}"
            f"&requestId={data.get('requestId', '')}"
            f"&responseTime={data.get('responseTime', '')}"
            f"&resultCode={result_code}"
            f"&transId={trans_id}"
        )
        expected_sig = hmac.new(
            secret_key.encode(), raw_signature.encode(), hashlib.sha256
        ).hexdigest()

        if signature != expected_sig:
            logger.warning(f"MoMo webhook: invalid signature for order {order_id}")
            return {"success": False, "reason": "Invalid signature"}

    # Chỉ xử lý giao dịch thành công
    if result_code != 0:
        logger.info(f"MoMo webhook: order {order_id} failed with code {result_code}")
        # Update payment status to failed
        result = await db.execute(
            select(Payment).where(
                Payment.transaction_id == order_id,
                Payment.status == "pending",
            )
        )
        payment = result.scalar_one_or_none()
        if payment:
            payment.status = "failed"
            payment.note = f"MoMo error: {data.get('message', '')}"
            await db.commit()
        return {"success": False, "reason": f"MoMo resultCode={result_code}"}

    # Tìm payment pending
    result = await db.execute(
        select(Payment).where(
            Payment.transaction_id == order_id,
            Payment.status == "pending",
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        logger.warning(f"MoMo webhook: không tìm thấy payment {order_id}")
        return {"success": False, "reason": f"Payment {order_id} not found"}

    # Kiểm tra số tiền
    if abs(float(payment.amount) - amount) > 1:
        logger.warning(f"MoMo webhook: sai số tiền - cần {payment.amount}, nhận {amount}")
        return {"success": False, "reason": "Amount mismatch"}

    payment.payment_ref = str(trans_id)
    result = await _complete_payment(db, payment, "MoMo")

    await db.commit()
    return result


def create_momo_payment_request(
    payment: Payment,
    channel_config: dict,
    return_url: str,
    notify_url: str,
) -> dict | None:
    """
    Tạo request body gửi đến MoMo API để tạo payment link.
    Returns request data dict hoặc None nếu thiếu config.
    """
    partner_code = channel_config.get("partner_code", "")
    access_key = channel_config.get("access_key", "")
    secret_key = channel_config.get("secret_key", "")
    endpoint = channel_config.get("endpoint", "https://payment.momo.vn/v2/gateway/api/create")

    if not all([partner_code, access_key, secret_key]):
        return None

    order_id = payment.transaction_id
    amount = int(payment.amount)
    order_info = f"Thanh toan RealSearch - {order_id}"
    request_id = order_id
    extra_data = ""

    # Create signature
    raw_signature = (
        f"accessKey={access_key}"
        f"&amount={amount}"
        f"&extraData={extra_data}"
        f"&ipnUrl={notify_url}"
        f"&orderId={order_id}"
        f"&orderInfo={order_info}"
        f"&partnerCode={partner_code}"
        f"&redirectUrl={return_url}"
        f"&requestId={request_id}"
        f"&requestType=payWithMethod"
    )
    sig = hmac.new(
        secret_key.encode(), raw_signature.encode(), hashlib.sha256
    ).hexdigest()

    return {
        "endpoint": endpoint,
        "body": {
            "partnerCode": partner_code,
            "partnerName": "RealSearch",
            "storeId": partner_code,
            "requestId": request_id,
            "amount": amount,
            "orderId": order_id,
            "orderInfo": order_info,
            "redirectUrl": return_url,
            "ipnUrl": notify_url,
            "lang": "vi",
            "requestType": "payWithMethod",
            "autoCapture": True,
            "extraData": extra_data,
            "signature": sig,
        },
    }


def _extract_transaction_id(content: str) -> str | None:
    """
    Trích mã giao dịch RS-XXXXXXXXXXXX từ nội dung chuyển khoản.
    Ngân hàng thường bỏ ký tự đặc biệt nên cần match cả:
      - RS-B6FDA6EC5155 (có dấu -)
      - RSB6FDA6EC5155  (không có dấu -)
    """
    upper = content.upper()
    # Thử match có dấu - trước
    match = re.search(r"RS-([A-Z0-9]{12})", upper)
    if match:
        return match.group(0)
    # Match không có dấu - (ngân hàng strip ký tự đặc biệt)
    match = re.search(r"RS([A-Z0-9]{12})", upper)
    if match:
        # Trả về format chuẩn RS-XXXXXXXXXXXX để match DB
        return f"RS-{match.group(1)}"
    return None


def generate_bank_transfer_info(payment: Payment, channel_config: dict) -> dict:
    """Tạo thông tin chuyển khoản ngân hàng cho user, kèm VietQR URL."""
    bank_name = channel_config.get("bank_name", "")
    account_number = channel_config.get("account_number", "")
    account_name = channel_config.get("account_name", "")
    amount = int(payment.amount)
    content = payment.transaction_id

    # Generate VietQR URL
    qr_url = _generate_vietqr_url(
        bank_name=bank_name,
        account_number=account_number,
        account_name=account_name,
        amount=amount,
        content=content,
        bank_code=channel_config.get("bank_code"),
    )

    return {
        "bank_name": bank_name,
        "account_number": account_number,
        "account_name": account_name,
        "branch": channel_config.get("branch", ""),
        "amount": float(payment.amount),
        "content": content,
        "qr_url": qr_url,
        "note": f"Chuyển khoản đúng số tiền {amount:,} VND với nội dung: {content}",
    }


# Map tên ngân hàng phổ biến sang mã VietQR
_BANK_CODE_MAP = {
    "bidv": "BIDV",
    "vietcombank": "VCB",
    "vcb": "VCB",
    "techcombank": "TCB",
    "tcb": "TCB",
    "mb bank": "MB",
    "mb": "MB",
    "mbbank": "MB",
    "vietinbank": "ICB",
    "icb": "ICB",
    "acb": "ACB",
    "sacombank": "STB",
    "stb": "STB",
    "tpbank": "TPB",
    "tpb": "TPB",
    "vpbank": "VPB",
    "vpb": "VPB",
    "agribank": "AGR",
    "vib": "VIB",
    "shb": "SHB",
    "hdbank": "HDB",
    "ocb": "OCB",
    "msb": "MSB",
    "eximbank": "EIB",
    "seabank": "SEAB",
    "lpb": "LPB",
    "lienvietpostbank": "LPB",
    "dong a bank": "DOB",
    "bac a bank": "BAB",
    "pvcombank": "PVCOM",
    "viet a bank": "VAB",
    "nam a bank": "NAB",
    "kienlongbank": "KLB",
    "cake": "CAKE",
    "ubank": "Ubank",
}


def _generate_vietqr_url(
    bank_name: str,
    account_number: str,
    account_name: str,
    amount: int,
    content: str,
    bank_code: str | None = None,
) -> str | None:
    """Tạo VietQR URL từ thông tin chuyển khoản."""
    if not account_number:
        return None

    # Determine bank code
    code = bank_code
    if not code:
        normalized = bank_name.lower().strip()
        code = _BANK_CODE_MAP.get(normalized)
        # Try partial match
        if not code:
            for key, val in _BANK_CODE_MAP.items():
                if key in normalized or normalized in key:
                    code = val
                    break

    if not code:
        return None

    from urllib.parse import quote
    return (
        f"https://img.vietqr.io/image/{code}-{account_number}-compact2.png"
        f"?amount={amount}&addInfo={quote(content)}&accountName={quote(account_name)}"
    )
