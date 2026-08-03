from django.conf import settings
from django.db import models


class AnalyticsEvent(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="analytics_events",
    )
    event_name = models.CharField(max_length=100)
    properties = models.JSONField(default=dict, blank=True)
    platform = models.CharField(max_length=20, blank=True, default="")
    app_version = models.CharField(max_length=30, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event_name", "created_at"], name="analytics_a_event_n_2b3b9b_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.event_name} ({self.created_at:%Y-%m-%d})"
