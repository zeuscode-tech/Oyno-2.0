from django.db import models
from django.conf import settings


class ChatRoom(models.Model):
    class ChatType(models.TextChoices):
        GAME = "game", "Игровой чат"
        DIRECT = "direct", "Личный чат"
        VENUE = "venue", "Чат площадки"

    type = models.CharField(max_length=20, choices=ChatType.choices, default=ChatType.GAME)
    title = models.CharField(max_length=150)
    avatar = models.ImageField(upload_to="chat_avatars/", null=True, blank=True)
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="chat_rooms",
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Чат-комната"
        verbose_name_plural = "Чат-комнаты"

    def __str__(self) -> str:
        return f"{self.type}: {self.title}"

    @property
    def last_message(self):
        return self.messages.order_by("-created_at").first()


class ChatMessage(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    text = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Сообщение"
        verbose_name_plural = "Сообщения"
        ordering = ["created_at"]
        indexes = [models.Index(fields=["room", "created_at"])]

    def __str__(self) -> str:
        return f"{self.sender.name}: {self.text[:40]}"
