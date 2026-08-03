from django.contrib import admin

from .models import AnalyticsEvent


@admin.register(AnalyticsEvent)
class AnalyticsEventAdmin(admin.ModelAdmin):
    list_display = ["event_name", "user", "platform", "app_version", "created_at"]
    list_filter = ["event_name", "platform", "created_at"]
    search_fields = ["event_name", "user__phone"]
    readonly_fields = ["user", "event_name", "properties", "platform", "app_version", "created_at"]
