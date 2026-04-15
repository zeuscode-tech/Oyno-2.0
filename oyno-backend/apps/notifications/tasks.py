from celery import shared_task
import firebase_admin
from firebase_admin import credentials, messaging
from django.conf import settings
import os

_firebase_initialized = False


def _init_firebase():
    global _firebase_initialized
    if not _firebase_initialized and settings.FIREBASE_CREDENTIALS_PATH:
        try:
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
        except Exception as e:
            print(f"[FCM] Init error: {e}")


@shared_task(bind=True, max_retries=3)
def send_push(
    self,
    token: str,
    title: str,
    body: str,
    data: dict = None,
) -> dict:
    """Celery task для отправки FCM push-уведомления."""
    _init_firebase()

    if not token:
        return {"status": "skipped", "reason": "no_token"}

    try:
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            token=token,
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    color="#C6FF00",
                    sound="default",
                ),
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound="default", badge=1)
                )
            ),
        )
        response = messaging.send(message)
        return {"status": "success", "message_id": response}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@shared_task
def send_push_to_many(tokens: list[str], title: str, body: str, data: dict = None):
    """Batch push для нескольких токенов (макс 500 за раз — лимит FCM)."""
    _init_firebase()
    if not tokens:
        return

    chunks = [tokens[i:i+500] for i in range(0, len(tokens), 500)]
    for chunk in chunks:
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            tokens=chunk,
        )
        messaging.send_multicast(message)
