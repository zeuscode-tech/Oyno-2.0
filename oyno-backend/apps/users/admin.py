from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, OTPCode


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["phone", "name", "role", "rank", "rating", "matches_played", "is_active"]
    list_filter = ["role", "rank", "is_active"]
    search_fields = ["phone", "name"]
    ordering = ["-date_joined"]
    fieldsets = (
        (None, {"fields": ("phone", "password")}),
        ("Персональные данные", {"fields": ("name", "avatar", "city")}),
        ("Статистика", {"fields": ("role", "rank", "rating", "reliability", "matches_played")}),
        ("Права", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("phone", "name", "password1", "password2")}),
    )


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display = ["phone", "code", "created_at", "is_used"]
    list_filter = ["is_used"]
