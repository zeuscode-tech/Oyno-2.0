from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "venue", "slot", "status", "payment_status", "total_price", "created_at"]
    list_filter = ["status", "payment_status"]
    search_fields = ["user__name", "user__phone", "venue__name"]
    date_hierarchy = "created_at"
    actions = ["confirm_bookings", "cancel_bookings"]

    @admin.action(description="Подтвердить выбранные брони")
    def confirm_bookings(self, request, queryset):
        queryset.update(status=Booking.Status.CONFIRMED)

    @admin.action(description="Отменить выбранные брони")
    def cancel_bookings(self, request, queryset):
        for b in queryset:
            b.cancel()
