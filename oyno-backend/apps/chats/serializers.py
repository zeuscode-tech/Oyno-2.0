from rest_framework import serializers
from apps.users.serializers import UserSerializer
from .models import ChatRoom, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ["id", "room_id", "sender", "text", "is_read", "created_at", "is_me"]
        read_only_fields = ["id", "sender", "is_read", "created_at", "is_me"]

    def get_is_me(self, obj: ChatMessage) -> bool:
        request = self.context.get("request")
        return bool(request and obj.sender_id == request.user.id)


class LastMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "text", "created_at"]


class ChatRoomSerializer(serializers.ModelSerializer):
    last_message = LastMessageSerializer(read_only=True)
    unread_count = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ["id", "type", "title", "avatar_url", "last_message", "unread_count"]

    def get_unread_count(self, obj: ChatRoom) -> int:
        request = self.context.get("request")
        if not request:
            return 0
        return obj.messages.filter(is_read=False).exclude(sender=request.user).count()

    def get_avatar_url(self, obj: ChatRoom) -> str | None:
        if obj.avatar:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.avatar.url) if request else None
        return None
