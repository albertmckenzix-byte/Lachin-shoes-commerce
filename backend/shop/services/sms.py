"""
SMS Notification Service for Lachin Shoes.
Supports real SMS delivery via Kavenegar or local console simulation during development.
"""
import json
import logging
import urllib.parse
import urllib.request
from django.conf import settings

logger = logging.getLogger(__name__)


def send_sms(phone: str, message: str) -> dict:
    """
    Send an SMS message to an Iranian phone number.
    Falls back gracefully to logger / simulation if no API key is configured.
    """
    clean_phone = str(phone).strip()
    api_key = getattr(settings, 'KAVENEGAR_API_KEY', '')

    if not api_key:
        logger.info(f"[SMS SIMULATOR] To: {clean_phone} | Message: {message}")
        try:
            print(f"\n[SMS SIMULATOR] To: {clean_phone}\n   Text: {message}\n")
        except UnicodeEncodeError:
            print(f"\n[SMS SIMULATOR] To: {clean_phone} (unicode text omitted in console)\n")
        return {"status": "simulated", "phone": clean_phone, "message": message}

    try:
        url = f"https://api.kavenegar.com/v1/{api_key}/sms/send.json"
        data = urllib.parse.urlencode({
            "receptor": clean_phone,
            "message": message,
        }).encode("utf-8")
        req = urllib.request.Request(url, data=data)
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data
    except Exception as exc:
        logger.error(f"Failed to send SMS to {clean_phone}: {exc}")
        return {"status": "error", "error": str(exc)}


def send_otp_sms(phone: str, code: str) -> dict:
    msg = f"کفش لاچین: کد تایید ورود شما {code} است. این کد تا ۲ دقیقه معتبر است."
    return send_sms(phone, msg)


def send_order_created_sms(order) -> dict:
    msg = (
        f"کفش لاچین: سفارش #{order.number} شما با موفقیت ثبت شد. "
        f"مبلغ: {order.total:,} تومان."
    )
    return send_sms(order.phone, msg)


def send_order_paid_sms(order) -> dict:
    tracking = order.transaction_id or "ثبت آنلاین"
    msg = (
        f"کفش لاچین: پرداخت سفارش #{order.number} با شماره پیگیری {tracking} تایید شد. "
        f"سفارش شما در مرحله آماده‌سازی قرار گرفت."
    )
    return send_sms(order.phone, msg)


def send_order_shipped_sms(order) -> dict:
    postal_code = order.shipping_tracking_code or "پست پیشتاز"
    msg = (
        f"کفش لاچین: سفارش #{order.number} شما ارسال شد. "
        f"کد رهگیری پستی: {postal_code}"
    )
    return send_sms(order.phone, msg)
