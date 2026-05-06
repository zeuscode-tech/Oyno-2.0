from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, permissions, parsers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import ChatRoom, ChatMessage
from .serializers import ChatRoomSerializer, ChatMessageSerializer

User = get_user_model()


class ChatRoomListView(generics.ListAPIView):
    serializer_class = ChatRoomSerializer

    def get_queryset(self):
        from django.db.models import F, ExpressionWrapper, DateTimeField
        from datetime import timedelta

        now = timezone.now()

        qs = (
            ChatRoom.objects
            .filter(participants=self.request.user)
            .select_related("game")
            .prefetch_related("messages", "participants")
        )

        # Собираем id игровых чат-комнат, у которых игра уже истекла
        expired_game_room_ids = list(
            ChatRoom.objects
            .filter(
                type=ChatRoom.ChatType.GAME,
                game__isnull=False,
            )
            .exclude(game__status__in=["waiting", "confirmed"])
            .values_list("id", flat=True)
        )

        # Также исключаем игровые чаты, где date_time + duration уже прошло
        from apps.games.models import Game
        expired_by_time_ids = []
        game_rooms = (
            ChatRoom.objects
            .filter(
                type=ChatRoom.ChatType.GAME,
                game__isnull=False,
                participants=self.request.user,
            )
            .select_related("game")
        )
        for room in game_rooms:
            game = room.game
            end_time = game.date_time + timedelta(hours=float(game.duration))
            if end_time < now:
                expired_by_time_ids.append(room.id)

        all_expired_ids = set(expired_game_room_ids) | set(expired_by_time_ids)

        qs = qs.exclude(id__in=all_expired_ids)

        return (
            qs.order_by("-messages__created_at")
            .distinct()
        )


class ChatMessageListView(generics.ListAPIView):
    serializer_class = ChatMessageSerializer

    def get_queryset(self):
        room_id = self.kwargs["room_id"]
        ChatRoom.objects.get(id=room_id, participants=self.request.user)
        qs = ChatMessage.objects.filter(room_id=room_id).select_related("sender")
        qs.exclude(sender=self.request.user).update(is_read=True)
        return qs


class UploadChatMediaView(APIView):
    """POST /chats/rooms/{room_id}/upload/ — загрузка медиа-файла в чат."""
    parser_classes = [parsers.MultiPartParser]

    def post(self, request, room_id):
        try:
            room = ChatRoom.objects.get(id=room_id, participants=request.user)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Room not found or no access'}, status=404)

        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)

        media_type = request.data.get('media_type', 'image')
        valid_types = [t[0] for t in ChatMessage.MediaType.choices]
        if media_type not in valid_types:
            media_type = 'image'

        msg = ChatMessage.objects.create(
            room=room,
            sender=request.user,
            text='',
            media_file=file,
            media_type=media_type,
        )

        media_url = request.build_absolute_uri(msg.media_file.url)

        # Broadcast to room via WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(f"chat_{room_id}", {
            "type": "chat_message",
            "id": msg.id,
            "room_id": int(room_id),
            "sender_id": request.user.id,
            "sender_name": request.user.name,
            "sender_avatar": None,
            "text": "",
            "media_url": media_url,
            "media_type": media_type,
            "created_at": msg.created_at.isoformat(),
        })

        serializer = ChatMessageSerializer(msg, context={'request': request})
        return Response(serializer.data, status=201)


class CreateDirectChatView(APIView):
    """POST /chats/rooms/direct/ — создать или найти личный чат с пользователем."""

    def post(self, request):
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"error": "user_id required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            other = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        if other == request.user:
            return Response({"error": "Cannot chat with yourself"}, status=status.HTTP_400_BAD_REQUEST)

        # Найти существующий личный чат между двумя пользователями
        existing = (
            ChatRoom.objects
            .filter(type=ChatRoom.ChatType.DIRECT, participants=request.user)
            .filter(participants=other)
            .first()
        )
        if existing:
            serializer = ChatRoomSerializer(existing, context={"request": request})
            return Response(serializer.data)

        # Создать новый
        room = ChatRoom.objects.create(
            type=ChatRoom.ChatType.DIRECT,
            title=f"{request.user.name} & {other.name}",
        )
        room.participants.set([request.user, other])

        serializer = ChatRoomSerializer(room, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class UpdateChatAvatarView(APIView):
    """PATCH /chats/rooms/{room_id}/avatar/ — смена аватара чата (только организатор)."""
    parser_classes = [parsers.MultiPartParser]

    def patch(self, request, room_id):
        try:
            room = ChatRoom.objects.select_related('game').get(
                id=room_id, participants=request.user
            )
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Room not found or no access'}, status=404)

        # Only game organizer can change avatar
        game = getattr(room, 'game', None)
        if game and game.organizer_id != request.user.id:
            return Response({'error': 'Only the game organizer can change the chat avatar'}, status=403)

        file = request.FILES.get('avatar')
        if not file:
            return Response({'error': 'No file provided'}, status=400)

        room.avatar = file
        room.save(update_fields=['avatar'])

        serializer = ChatRoomSerializer(room, context={'request': request})
        return Response(serializer.data)
