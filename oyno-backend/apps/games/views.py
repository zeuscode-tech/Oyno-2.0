from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Game, GameParticipant
from .serializers import GameListSerializer, GameDetailSerializer, GameCreateSerializer


class GameViewSet(viewsets.ModelViewSet):
    queryset = (
        Game.objects
        .exclude(status=Game.Status.CANCELLED)
        .select_related("venue", "organizer", "chat_room")
        .prefetch_related("participants")
    )
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["sport_id", "status", "level"]
    search_fields = ["title", "venue__name"]
    ordering_fields = ["date_time", "created_at"]
    ordering = ["date_time"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return GameDetailSerializer
        if self.action in ("create", "update", "partial_update"):
            return GameCreateSerializer
        return GameListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        city = self.request.query_params.get("city")
        if city:
            qs = qs.filter(venue__city=city)
        return qs

    @action(detail=False, methods=["get"], url_path="my")
    def my_games(self, request):
        """Игры текущего пользователя (записан или организовал)."""
        qs = Game.objects.filter(
            participants__user=request.user,
            participants__is_active=True,
        ).select_related("venue", "organizer", "chat_room").distinct()

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        serializer = GameListSerializer(qs, many=True, context={"request": request})
        return Response({"count": qs.count(), "results": serializer.data})

    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
        game: Game = self.get_object()

        if game.players_joined >= game.players_total:
            return Response({"detail": "Игра уже заполнена."}, status=status.HTTP_400_BAD_REQUEST)

        participant, created = GameParticipant.objects.get_or_create(
            game=game, user=request.user,
            defaults={"is_active": True},
        )
        if not created and participant.is_active:
            return Response({"detail": "Ты уже в игре."}, status=status.HTTP_400_BAD_REQUEST)

        participant.is_active = True
        participant.save(update_fields=["is_active"])

        # Добавляем в чат
        if game.chat_room:
            game.chat_room.participants.add(request.user)

        game.update_status()

        # Push-уведомление организатору
        from apps.notifications.tasks import send_push
        if game.organizer.fcm_token:
            send_push.delay(
                token=game.organizer.fcm_token,
                title="Новый участник",
                body=f"{request.user.name} записался на игру «{game.title}»",
            )

        serializer = GameDetailSerializer(game, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        game: Game = self.get_object()
        try:
            participant = GameParticipant.objects.get(game=game, user=request.user)
            participant.is_active = False
            participant.save(update_fields=["is_active"])
            game.update_status()
            return Response({"detail": "Ты покинул игру."})
        except GameParticipant.DoesNotExist:
            return Response({"detail": "Ты не в этой игре."}, status=status.HTTP_400_BAD_REQUEST)
