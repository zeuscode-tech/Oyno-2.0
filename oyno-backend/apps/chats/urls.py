from django.urls import path
from .views import ChatRoomListView, ChatMessageListView

urlpatterns = [
    path("rooms/",                         ChatRoomListView.as_view(),    name="chat-rooms"),
    path("rooms/<int:room_id>/messages/",  ChatMessageListView.as_view(), name="chat-messages"),
]
