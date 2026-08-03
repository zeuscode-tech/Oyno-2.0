import secrets
import string
import requests
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import OTPCode


def generate_otp() -> str:
    return "".join(secrets.choice(string.digits) for _ in range(settings.OTP_LENGTH))


def send_otp_sms(phone: str, code: str) -> bool:
    """Отправляет OTP через Eskiz (или другой SMS-провайдер KG)."""
    if settings.DEBUG:
        # В разработке — просто печатаем в консоль
        print(f"[DEV] OTP для {phone}: {code}")
        return True

    if not all((settings.SMS_API_URL, settings.SMS_EMAIL, settings.SMS_PASSWORD)):
        print("[SMS ERROR] SMS provider is not configured: set SMS_API_URL, SMS_EMAIL and SMS_PASSWORD")
        return False

    try:
        # Получаем токен Eskiz
        auth_url = f"{settings.SMS_API_URL.removesuffix('/message/sms/send')}/auth/login"
        auth_resp = requests.post(
            auth_url,
            data={"email": settings.SMS_EMAIL, "password": settings.SMS_PASSWORD},
            timeout=10,
        )
        auth_resp.raise_for_status()
        token = auth_resp.json().get("data", {}).get("token", "")
        if not token:
            print("[SMS ERROR] SMS provider returned no auth token")
            return False

        resp = requests.post(
            settings.SMS_API_URL,
            headers={"Authorization": f"Bearer {token}"},
            data={
                "mobile_phone": phone.lstrip("+"),
                "message": f"Ваш код OYNO: {code}. Не передавайте никому.",
                "from": settings.SMS_SENDER,
            },
            timeout=10,
        )
        resp.raise_for_status()
        return True
    except Exception as e:
        print(f"[SMS ERROR] {e}")
        return False


def create_otp(phone: str) -> str:
    recent_since = timezone.now() - timedelta(minutes=10)
    recent_count = OTPCode.objects.filter(
        phone=phone,
        created_at__gte=recent_since,
    ).count()
    if recent_count >= 5:
        raise ValueError("Слишком много запросов. Попробуйте через 10 минут.")

    code = generate_otp()
    if not send_otp_sms(phone, code):
        raise RuntimeError("Не удалось отправить SMS-код.")

    OTPCode.objects.filter(phone=phone, is_used=False).update(is_used=True)
    OTPCode.objects.create(phone=phone, code=code)
    return code


def verify_otp(phone: str, code: str) -> bool:
    expire_at = timezone.now() - timedelta(seconds=settings.OTP_EXPIRE_SECONDS)
    otp = OTPCode.objects.filter(
        phone=phone,
        code=code,
        is_used=False,
        created_at__gte=expire_at,
    ).first()

    if not otp:
        return False

    otp.is_used = True
    otp.save(update_fields=["is_used"])
    return True
