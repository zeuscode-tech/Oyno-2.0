from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, phone: str, password: str = None, **extra):
        if not phone:
            raise ValueError("Phone is required")
        user = self.model(phone=phone, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, phone: str, password: str, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(phone, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        PLAYER = "player", "Игрок"
        VENUE_OWNER = "venue_owner", "Владелец площадки"

    class Rank(models.TextChoices):
        BEGINNER = "beginner", "Новичок"
        INTERMEDIATE = "intermediate", "Любитель"
        ADVANCED = "advanced", "Продвинутый игрок"
        PRO = "pro", "Профессионал"

    phone = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    city = models.CharField(max_length=100, default="Бишкек")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.PLAYER)
    rank = models.CharField(max_length=20, choices=Rank.choices, default=Rank.BEGINNER)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0.0)
    reliability = models.PositiveSmallIntegerField(default=100)  # %
    matches_played = models.PositiveIntegerField(default=0)
    fcm_token = models.TextField(blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = ["name"]

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

    def __str__(self) -> str:
        return f"{self.name} ({self.phone})"

    def update_rank(self) -> None:
        """Автоматически обновляет ранг по количеству матчей."""
        m = self.matches_played
        if m >= 100:
            self.rank = self.Rank.PRO
        elif m >= 30:
            self.rank = self.Rank.ADVANCED
        elif m >= 10:
            self.rank = self.Rank.INTERMEDIATE
        else:
            self.rank = self.Rank.BEGINNER
        self.save(update_fields=["rank"])


class OTPCode(models.Model):
    phone = models.CharField(max_length=20)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        verbose_name = "OTP-код"
        indexes = [models.Index(fields=["phone", "is_used"])]

    def __str__(self) -> str:
        return f"{self.phone} → {self.code}"
