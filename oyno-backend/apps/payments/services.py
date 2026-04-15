"""
Интеграция с Mbank и O!Деньги (Kyrgyzstan).
Документация: уточняй у провайдера — оба используют REST + HMAC-подпись.
"""
import hashlib
import hmac
import requests
from django.conf import settings


def _mbank_sign(data: dict) -> str:
    """Генерирует HMAC-SHA256 подпись для Mbank."""
    payload = "&".join(f"{k}={v}" for k, v in sorted(data.items()))
    return hmac.new(
        settings.MBANK_SECRET_KEY.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()


def initiate_mbank_payment(
    payment_id: int,
    amount: float,
    card_token: str,
    description: str,
) -> dict:
    """
    Инициирует платёж через Mbank.
    Возвращает dict с gateway_payment_id и статусом.
    """
    data = {
        "merchant_id": settings.MBANK_MERCHANT_ID,
        "order_id": str(payment_id),
        "amount": int(amount * 100),  # в тыйынах
        "currency": "KGS",
        "description": description,
        "card_token": card_token,
    }
    data["sign"] = _mbank_sign(data)

    try:
        resp = requests.post(
            f"{settings.MBANK_API_URL}/payment/create",
            json=data,
            timeout=15,
        )
        result = resp.json()
        return {
            "gateway_payment_id": result.get("payment_id", ""),
            "status": "success" if result.get("status") == "OK" else "pending",
            "redirect_url": result.get("3ds_url"),
        }
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def confirm_mbank_payment(gateway_payment_id: str, otp: str = None) -> dict:
    data = {
        "merchant_id": settings.MBANK_MERCHANT_ID,
        "payment_id": gateway_payment_id,
    }
    if otp:
        data["otp"] = otp
    data["sign"] = _mbank_sign(data)

    try:
        resp = requests.post(
            f"{settings.MBANK_API_URL}/payment/confirm",
            json=data,
            timeout=15,
        )
        result = resp.json()
        return {
            "status": "success" if result.get("status") == "OK" else "failed",
        }
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def initiate_odengi_payment(
    payment_id: int,
    amount: float,
    phone: str,
    description: str,
) -> dict:
    """Инициирует платёж через O!Деньги (по номеру телефона)."""
    data = {
        "merchant_id": settings.ODENGI_MERCHANT_ID,
        "order_id": str(payment_id),
        "amount": str(amount),
        "phone": phone,
        "description": description,
    }
    signature = hmac.new(
        settings.ODENGI_SECRET_KEY.encode(),
        f"{payment_id}{amount}{phone}".encode(),
        hashlib.sha256,
    ).hexdigest()
    data["signature"] = signature

    try:
        resp = requests.post(
            f"{settings.ODENGI_API_URL}/payment",
            json=data,
            timeout=15,
        )
        result = resp.json()
        return {
            "gateway_payment_id": result.get("transaction_id", ""),
            "status": "pending",  # O!Деньги требует OTP подтверждения
        }
    except Exception as e:
        return {"status": "failed", "error": str(e)}
