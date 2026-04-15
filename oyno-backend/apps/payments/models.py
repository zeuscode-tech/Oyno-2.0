from django.db import models
from django.conf import settings


class PaymentMethod(models.Model):
    class MethodType(models.TextChoices):
        VISA = "visa", "Visa"
        MASTERCARD = "mastercard", "MasterCard"
        ELCART = "elcart", "Элкарт"
        MBANK = "mbank", "Mbank"
        ODENGI = "odengi", "O!Деньги"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payment_methods",
    )
    type = models.CharField(max_length=20, choices=MethodType.choices)
    last4 = models.CharField(max_length=4)
    label = models.CharField(max_length=50)  # "Visa •••• 4242"
    token = models.TextField()  # токен от платёжного шлюза (зашифрован)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Способ оплаты"
        verbose_name_plural = "Способы оплаты"

    def __str__(self) -> str:
        return f"{self.user.name} — {self.label}"

    def save(self, *args, **kwargs):
        # Сбрасываем default с других при установке нового
        if self.is_default:
            PaymentMethod.objects.filter(user=self.user, is_default=True).update(is_default=False)
        super().save(*args, **kwargs)


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Ожидает"
        SUCCESS = "success", "Успешно"
        FAILED = "failed", "Ошибка"
        REFUNDED = "refunded", "Возврат"

    booking = models.OneToOneField(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="payment",
    )
    method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.SET_NULL,
        null=True,
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    gateway = models.CharField(max_length=20)  # "mbank" | "odengi"
    gateway_payment_id = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Платёж"
        verbose_name_plural = "Платежи"
        ordering = ["-created_at"]
