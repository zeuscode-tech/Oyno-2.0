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
    list_display = ["name", "city", "sport_id", "type", "rating", "price_per_hour", "is_active"]
    list_filter = ["city", "sport_id", "type", "is_active"]
    search_fields = ["name", "address"]
    inlines = [VenueImageInline, TimeSlotInline]


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = ["venue", "date", "start_time", "end_time", "price", "is_available"]
    list_filter = ["is_available", "venue"]
    date_hierarchy = "date"
