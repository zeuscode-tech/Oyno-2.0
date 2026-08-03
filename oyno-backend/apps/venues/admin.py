from django.contrib import admin
from .models import Venue, VenueImage, TimeSlot, VenueReview


class VenueImageInline(admin.TabularInline):
    model = VenueImage
    extra = 1


class TimeSlotInline(admin.TabularInline):
    model = TimeSlot
    extra = 0


@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ["name", "city", "sport_id", "type", "verification_status", "rating", "price_per_hour", "is_active"]
    list_filter = ["city", "sport_id", "type", "verification_status", "is_active"]
    search_fields = ["name", "address"]
    inlines = [VenueImageInline, TimeSlotInline]
    readonly_fields = ["source_phones", "source_photo_urls", "source_phone_note"]
    ordering = ["verification_status", "-created_at"]

    @admin.action(description="Approve selected venues")
    def approve_venues(self, request, queryset):
        queryset.update(
            verification_status=Venue.VerificationStatus.VERIFIED,
            is_active=True,
        )

    @admin.action(description="Reject selected venues")
    def reject_venues(self, request, queryset):
        queryset.update(
            verification_status=Venue.VerificationStatus.REJECTED,
            is_active=False,
        )

    actions = ["approve_venues", "reject_venues"]


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = ["venue", "date", "start_time", "end_time", "price", "is_available"]
    list_filter = ["is_available", "venue"]
    date_hierarchy = "date"
