from django.contrib import admin
from .models import PaymentMethod, Payment


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ["user", "type", "label", "is_default", "created_at"]
    list_filter = ["type", "is_default"]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "booking", "amount", "status", "gateway", "created_at"]
    list_filter = ["status", "gateway"]
    date_hierarchy = "created_at"
