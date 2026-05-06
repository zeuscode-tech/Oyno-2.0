from django.db import models
from django.conf import settings


class Venue(models.Model):
    class VenueType(models.TextChoices):
        STADIUM = "stadium", "Стадион"
        GYM = "gym", "Зал"
        POOL = "pool", "Бассейн"
        COURT = "court", "Корт"
        FIELD = "field", "Поле"

    class SportId(models.TextChoices):
        FOOTBALL = "football", "Футбол"
        BASKETBALL = "basketball", "Баскетбол"
        VOLLEYBALL = "volleyball", "Волейбол"
        TENNIS = "tennis", "Теннис"
        SWIMMING = "swimming", "Плавание"
        OTHER = "other", "Другое"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_venues",
    )
    name = models.CharField(max_length=150)
    type = models.CharField(max_length=20, choices=VenueType.choices, default=VenueType.FIELD)
    sport_id = models.CharField(max_length=20, choices=SportId.choices, default=SportId.FOOTBALL)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100, default="Бишкек")
    lat = models.DecimalField(max_digits=10, decimal_places=7, default=42.8700)
    lng = models.DecimalField(max_digits=10, decimal_places=7, default=74.5900)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0.0)
    reviews_count = models.PositiveIntegerField(default=0)
    price_per_hour = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    description = models.TextField(blank=True)
    link_2gis = models.URLField("Ссылка на 2ГИС", max_length=500, blank=True)
    amenities = models.JSONField(default=list)  # ["Душевые", "Парковка", ...]
    working_hours = models.JSONField(
        default=dict  # {"open": "08:00", "close": "22:00", "days": [1,2,3,4,5,6,7]}
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Площадка"
        verbose_name_plural = "Площадки"
        indexes = [
            models.Index(fields=["city", "sport_id"]),
            models.Index(fields=["owner"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.city})"


class VenueImage(models.Model):
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name="images_set")
    image = models.ImageField(upload_to="venues/")
    is_main = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "Фото площадки"


class TimeSlot(models.Model):
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name="time_slots")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    price = models.DecimalField(max_digits=8, decimal_places=2)
    is_available = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Временной слот"
        verbose_name_plural = "Временные слоты"
        unique_together = [("venue", "date", "start_time")]
        indexes = [models.Index(fields=["venue", "date", "is_available"])]

    def __str__(self) -> str:
        return f"{self.venue.name} {self.date} {self.start_time}–{self.end_time}"


class VenueReview(models.Model):
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name="reviews")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField()  # 1-5
    text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Отзыв"
        unique_together = [("venue", "author")]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Пересчитываем рейтинг площадки
        from django.db.models import Avg
        agg = VenueReview.objects.filter(venue=self.venue).aggregate(avg=Avg("rating"))
        self.venue.rating = round(agg["avg"] or 0, 1)
        self.venue.reviews_count = VenueReview.objects.filter(venue=self.venue).count()
        self.venue.save(update_fields=["rating", "reviews_count"])
    