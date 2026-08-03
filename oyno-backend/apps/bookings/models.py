from django.db import models, transaction
from django.conf import settings


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Ожидает"
        CONFIRMED = "confirmed", "Подтверждено"
        CANCELLED = "cancelled", "Отменено"
        COMPLETED = "completed", "Завершено"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Не оплачено"
        PAID = "paid", "Оплачено"
        REFUNDED = "refunded", "Возврат"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    venue = models.ForeignKey(
        "venues.Venue",
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    slot = models.OneToOneField(
        "venues.TimeSlot",
        on_delete=models.CASCADE,
        related_name="booking",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method_id = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Бронирование"
        verbose_name_plural = "Бронирования"
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["venue", "status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Бронь #{self.id} — {self.venue.name} [{self.status}]"

    def cancel(self) -> None:
        with transaction.atomic():
            slot = type(self.slot).objects.select_for_update().get(pk=self.slot_id)
            self.status = self.Status.CANCELLED
            self.save(update_fields=["status", "updated_at"])
            slot.is_available = True
            slot.save(update_fields=["is_available"])


class BookingRequest(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "Новая"
        CONTACTED = "contacted", "Связались"
        CONFIRMED = "confirmed", "Подтверждена"
        CANCELLED = "cancelled", "Отменена"

    venue = models.ForeignKey(
        "venues.Venue",
        on_delete=models.CASCADE,
        related_name="booking_requests",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking_requests",
    )
    customer_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=30)
    sport_id = models.CharField(max_length=20, blank=True)
    preferred_date = models.DateField(null=True, blank=True)
    preferred_time = models.CharField(max_length=40, blank=True)
    players_count = models.PositiveSmallIntegerField(null=True, blank=True)
    comment = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    source = models.CharField(max_length=30, default="mobile")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Заявка на бронь"
        verbose_name_plural = "Заявки на бронь"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["venue", "status"]),
            models.Index(fields=["phone", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"Заявка #{self.id} - {self.venue.name} [{self.status}]"
