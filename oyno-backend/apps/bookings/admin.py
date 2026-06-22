from django.contrib import admin
from .models import Booking, BookingRequest


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


@admin.register(BookingRequest)
class BookingRequestAdmin(admin.ModelAdmin):
    list_display = [
        "id", "venue", "customer_name", "phone", "preferred_date",
        "preferred_time", "players_count", "status", "created_at",
    ]
    list_filter = ["status", "sport_id", "preferred_date", "venue"]
    search_fields = ["customer_name", "phone", "venue__name", "comment"]
    date_hierarchy = "created_at"
    actions = ["mark_contacted", "mark_confirmed", "mark_cancelled"]

    @admin.action(description="Отметить: связались")
    def mark_contacted(self, request, queryset):
        queryset.update(status=BookingRequest.Status.CONTACTED)

    @admin.action(description="Отметить: подтверждена")
    def mark_confirmed(self, request, queryset):
        queryset.update(status=BookingRequest.Status.CONFIRMED)

    @admin.action(description="Отметить: отменена")
    def mark_cancelled(self, request, queryset):
        queryset.update(status=BookingRequest.Status.CANCELLED)
