import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer для чат-комнат.
    URL: ws/chat/<room_id>/
    """

    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"chat_{self.room_id}"
        self.user = self.scope["user"]

        # Проверяем, что пользователь аутентифицирован
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Проверяем, что пользователь является участником комнаты
        if not await self.is_participant():
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data: str):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get("type")

        if msg_type == "chat.message":
            text = data.get("text", "").strip()
            if not text:
                return
            message = await self.save_message(text)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message",
                    "id": message.id,
                    "room_id": int(self.room_id),
                    "sender_id": self.user.id,
                    "sender_name": self.user.name,
                    "sender_avatar": None,
                    "text": text,
                    "created_at": message.created_at.isoformat(),
                },
            )
            # Push тем, кто оффлайн
            await self.push_to_offline(text)

        elif msg_type == "chat.typing":
            is_typing = data.get("is_typing", False)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_typing",
                    "user_name": self.user.name,
                    "user_id": self.user.id,
                    "is_typing": is_typing,
                },
            )

    # ── Event handlers ───────────────────────────────────
    async def chat_message(self, event: dict):
        await self.send(text_data=json.dumps({
            "type": "chat.message",
            "payload": {
                "id": event["id"],
                "room_id": event["room_id"],
                "sender_id": event["sender_id"],
                "sender_name": event["sender_name"],
                "sender_avatar": event["sender_avatar"],
                "text": event["text"],
                "created_at": event["created_at"],
            },
        }))

    async def chat_typing(self, event: dict):
        if event["user_id"] != self.user.id:
            await self.send(text_data=json.dumps({
                "type": "chat.typing",
                "payload": {
                    "user_name": event["user_name"],
                    "is_typing": event["is_typing"],
                },
            }))

    # ── DB helpers ───────────────────────────────────────
    @database_sync_to_async
    def is_participant(self) -> bool:
        from .models import ChatRoom
        return ChatRoom.objects.filter(
            id=self.room_id,
            participants=self.user,
        ).exists()

    @database_sync_to_async
    def save_message(self, text: str):
        from .models import ChatRoom, ChatMessage
        room = ChatRoom.objects.get(id=self.room_id)
        return ChatMessage.objects.create(room=room, sender=self.user, text=text)

    @database_sync_to_async
    def push_to_offline(self, text: str):
        """Отправляет FCM-push тем участникам, кто не в WS."""
        from .models import ChatRoom
        from apps.notifications.tasks import send_push
        room = ChatRoom.objects.get(id=self.room_id)
        for participant in room.participants.exclude(id=self.user.id):
            if participant.fcm_token:
                send_push.delay(
                    token=participant.fcm_token,
                    title=f"{room.title}",
                    body=f"{self.user.name}: {text[:80]}",
                    data={"type": "chat", "room_id": str(self.room_id)},
                )
