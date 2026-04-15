from rest_framework import generics, permissions
from rest_framework.response import Response
from .models import ChatRoom, ChatMessage
from .serializers import ChatRoomSerializer, ChatMessageSerializer


class ChatRoomListView(generics.ListAPIView):
    serializer_class = ChatRoomSerializer

    def get_queryset(self):
        return (
            ChatRoom.objects
            .filter(participants=self.request.user)
            .prefetch_related("messages", "participants")
            .order_by("-messages__created_at")
            .distinct()
        )


class ChatMessageListView(generics.ListAPIView):
    serializer_class = ChatMessageSerializer

    def get_queryset(self):
        room_id = self.kwargs["room_id"]
        # Убеждаемся, что пользователь является участником
        ChatRoom.objects.get(id=room_id, participants=self.request.user)
        qs = ChatMessage.objects.filter(room_id=room_id).select_related("sender")
        # Отмечаем сообщения прочитанными
        qs.exclude(sender=self.request.user).update(is_read=True)
        return qs
