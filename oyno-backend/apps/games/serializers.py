from rest_framework import serializers
from apps.users.serializers import UserSerializer
from apps.venues.serializers import VenueListSerializer
from apps.venues.models import Venue
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
        prefetched_participants = obj._prefetched_objects_cache.get("participants") if hasattr(obj, "_prefetched_objects_cache") else None
        if prefetched_participants is not None:
            return any(
                participant.user_id == request.user.id and participant.is_active
                for participant in prefetched_participants
            )
        return obj.participants.filter(user=request.user, is_active=True).exists()


class GameDetailSerializer(GameListSerializer):
    organizer = UserSerializer(read_only=True)

    class Meta(GameListSerializer.Meta):
        fields = GameListSerializer.Meta.fields + ["description", "organizer", "created_at"]


SPORT_NAMES = {
    "football": "Футбол",
    "basketball": "Баскет",
    "volleyball": "Волейбол",
    "tennis": "Теннис",
    "swimming": "Плавание",
}


class GameCreateSerializer(serializers.ModelSerializer):
    # Принимаем venue_id вместо venue
    venue_id = serializers.PrimaryKeyRelatedField(
        source="venue",
        queryset=Venue.objects.all(),
    )

    class Meta:
        model = Game
        fields = [
            "venue_id", "sport_id", "date_time",
            "duration", "players_needed",
            "level", "description",
        ]

    def create(self, validated_data: dict) -> Game:
        from apps.chats.models import ChatRoom
        request = self.context["request"]
        validated_data["organizer"] = request.user

        # Авто-генерируем title из вида спорта и даты
        sport_name = SPORT_NAMES.get(validated_data.get("sport_id", ""), "Игра")
        dt = validated_data.get("date_time")
        date_str = dt.strftime("%d.%m %H:%M") if dt else ""
        validated_data["title"] = f"{sport_name} {date_str}"

        # players_total = players_needed
        validated_data["players_total"] = validated_data.get("players_needed", 10)

        game = Game(**validated_data)
        game.save()

        # Создаём чат-комнату для игры
        room = ChatRoom.objects.create(
            type=ChatRoom.ChatType.GAME,
            title=game.title,
        )
        room.participants.add(request.user)
        game.chat_room = room
        game.save(update_fields=["chat_room"])

        # Организатор автоматически участник
        from .models import GameParticipant
        GameParticipant.objects.create(game=game, user=request.user, is_active=True)

        return game


class GameResultSerializer(serializers.ModelSerializer):
    mvp_name = serializers.CharField(source="mvp.name", read_only=True)

    class Meta:
        model = GameResult
        fields = ["id", "result_text", "stats", "mvp_name", "created_at"]
