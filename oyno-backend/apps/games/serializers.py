from rest_framework import serializers
from apps.users.serializers import UserSerializer
from apps.venues.serializers import VenueListSerializer
from .models import Game, GameParticipant, GameResult


class GameListSerializer(serializers.ModelSerializer):
    venue = VenueListSerializer(read_only=True)
    players_joined = serializers.IntegerField(read_only=True)
    is_joined = serializers.SerializerMethodField()
    chat_room_id = serializers.IntegerField(source="chat_room.id", read_only=True)

    class Meta:
        model = Game
        fields = [
            "id", "title", "sport_id", "venue",
            "date_time", "duration", "players_needed",
            "players_joined", "players_total", "level",
            "status", "is_joined", "chat_room_id",
        ]

    def get_is_joined(self, obj: Game) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.participants.filter(user=request.user, is_active=True).exists()


class GameDetailSerializer(GameListSerializer):
    organizer = UserSerializer(read_only=True)

    class Meta(GameListSerializer.Meta):
        fields = GameListSerializer.Meta.fields + ["description", "organizer", "created_at"]


class GameCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = [
            "title", "sport_id", "venue", "date_time",
            "duration", "players_needed", "players_total",
            "level", "description",
        ]

    def create(self, validated_data: dict) -> Game:
        from apps.chats.models import ChatRoom
        request = self.context["request"]
        validated_data["organizer"] = request.user

        # Автоматически создаём чат-комнату для игры
        game = Game(**validated_data)
        game.save()
        room = ChatRoom.objects.create(
            type=ChatRoom.ChatType.GAME,
            title=game.title,
        )
        room.participants.add(request.user)
        game.chat_room = room
        game.save(update_fields=["chat_room"])
        return game


class GameResultSerializer(serializers.ModelSerializer):
    mvp_name = serializers.CharField(source="mvp.name", read_only=True)

    class Meta:
        model = GameResult
        fields = ["id", "result_text", "stats", "mvp_name", "created_at"]
