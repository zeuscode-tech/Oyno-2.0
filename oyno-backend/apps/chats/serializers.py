from rest_framework import serializers
from apps.users.serializers import UserSerializer
from .models import ChatRoom, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    is_me = serializers.SerializerMethodField()
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            "id", "room_id", "sender", "text",
            "media_url", "media_type",
            "is_read", "created_at", "is_me",
        ]
        read_only_fields = ["id", "sender", "is_read", "created_at", "is_me"]

    def get_is_me(self, obj: ChatMessage) -> bool:
        request = self.context.get("request")
        return bool(request and obj.sender_id == request.user.id)

    def get_media_url(self, obj: ChatMessage) -> str | None:
        if not obj.media_file:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.media_file.url) if request else obj.media_file.url


class LastMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "text", "media_type", "created_at"]


class ChatRoomSerializer(serializers.ModelSerializer):
    last_message = LastMessageSerializer(read_only=True)
    unread_count = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    organizer_id = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    game_date_time = serializers.SerializerMethodField()
    game_duration = serializers.SerializerMethodField()
    game_status = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ["id", "type", "title", "avatar_url", "last_message",
                  "unread_count", "organizer_id", "participants",
                  "game_date_time", "game_duration", "game_status"]

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

    def get_organizer_id(self, obj: ChatRoom) -> int | None:
        game = getattr(obj, 'game', None)
        return game.organizer_id if game else None

    def get_game_date_time(self, obj: ChatRoom) -> str | None:
        game = getattr(obj, 'game', None)
        return game.date_time.isoformat() if game else None

    def get_game_duration(self, obj: ChatRoom) -> float | None:
        game = getattr(obj, 'game', None)
        return float(game.duration) if game else None

    def get_game_status(self, obj: ChatRoom) -> str | None:
        game = getattr(obj, 'game', None)
        return game.status if game else None

    def get_participants(self, obj: ChatRoom):
        from apps.users.serializers import UserSerializer
        return UserSerializer(
            obj.participants.all(), many=True, context=self.context
        ).data
