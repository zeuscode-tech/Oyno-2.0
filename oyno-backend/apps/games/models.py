from django.db import models
from django.conf import settings


class Game(models.Model):
    class Status(models.TextChoices):
        WAITING = "waiting", "Ожидание"
        CONFIRMED = "confirmed", "Подтверждён"
        COMPLETED = "completed", "Завершён"
        CANCELLED = "cancelled", "Отменён"

    class Level(models.TextChoices):
        ANY = "ANY", "Любой"
        BEGINNER = "BEGINNER", "Новичок"
        INTERMEDIATE = "INTERMEDIATE", "Любитель"
        ADVANCED = "ADVANCED", "Продвинутый"

    title = models.CharField(max_length=150)
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organized_games",
    )
    sport_id = models.CharField(max_length=20)
    venue = models.ForeignKey(
        "venues.Venue",
        on_delete=models.SET_NULL,
        null=True,
        related_name="games",
    )
    date_time = models.DateTimeField()
    duration = models.DecimalField(max_digits=3, decimal_places=1, default=1.5)  # часы
    players_needed = models.PositiveSmallIntegerField(default=10)
    players_total = models.PositiveSmallIntegerField(default=10)
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.ANY)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.WAITING)
    description = models.TextField(blank=True)
    chat_room = models.OneToOneField(
        "chats.ChatRoom",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="game",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Игра"
        verbose_name_plural = "Игры"
        indexes = [
            models.Index(fields=["sport_id", "status"]),
            models.Index(fields=["date_time"]),
        ]
        ordering = ["date_time"]

    def __str__(self) -> str:
        return f"{self.title} ({self.date_time:%d.%m %H:%M})"

    @property
    def players_joined(self) -> int:
        return self.participants.filter(is_active=True).count()

    def update_status(self) -> None:
        if self.players_joined >= self.players_total:
            self.status = self.Status.CONFIRMED
        else:
            self.status = self.Status.WAITING
        self.save(update_fields=["status"])


class GameParticipant(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="game_participations",
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Участник игры"
        unique_together = [("game", "user")]

    def __str__(self) -> str:
        return f"{self.user.name} → {self.game.title}"


class GameResult(models.Model):
    game = models.OneToOneField(Game, on_delete=models.CASCADE, related_name="result")
    result_text = models.CharField(max_length=100, blank=True)  # "Победа 3-2"
    stats = models.TextField(blank=True)
    mvp = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mvp_games",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Результат игры"
