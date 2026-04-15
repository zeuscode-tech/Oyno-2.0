from django.contrib import admin
from .models import ChatRoom, ChatMessage


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ["title", "type", "created_at"]
    filter_horizontal = ["participants"]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ["room", "sender", "text", "created_at", "is_read"]
    list_filter = ["is_read"]
    date_hierarchy = "created_at"
