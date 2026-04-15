import random
import string
import requests
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import OTPCode


def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=settings.OTP_LENGTH))


def send_otp_sms(phone: str, code: str) -> bool:
    """Отправляет OTP через Eskiz (или другой SMS-провайдер KG)."""
    if settings.DEBUG:
        # В разработке — просто печатаем в консоль
        print(f"[DEV] OTP для {phone}: {code}")
        return True

    try:
        # Получаем токен Eskiz
        auth_resp = requests.post(
            f"{settings.SMS_API_URL.rstrip('/message/sms/send')}/auth/login",
            data={"email": settings.SMS_EMAIL, "password": settings.SMS_PASSWORD},
            timeout=10,
        )
        token = auth_resp.json().get("data", {}).get("token", "")

        resp = requests.post(
            settings.SMS_API_URL,
            headers={"Authorization": f"Bearer {token}"},
            data={
                "mobile_phone": phone.lstrip("+"),
                "message": f"Ваш код OYNO: {code}. Не передавайте никому.",
                "from": "4546",
            },
            timeout=10,
        )
        return resp.status_code == 200
    except Exception as e:
        print(f"[SMS ERROR] {e}")
        return False


def create_otp(phone: str) -> str:
    # Деактивируем старые коды
    OTPCode.objects.filter(phone=phone, is_used=False).update(is_used=True)
    code = generate_otp()
    OTPCode.objects.create(phone=phone, code=code)
    send_otp_sms(phone, code)
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
