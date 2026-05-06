from django.urls import path
from .views import (
    ChatRoomListView, ChatMessageListView,
    UploadChatMediaView, UpdateChatAvatarView,
    CreateDirectChatView,
)

urlpatterns = [
    path("rooms/",                              ChatRoomListView.as_view(),     name="chat-rooms"),
    path("rooms/direct/",                       CreateDirectChatView.as_view(), name="chat-direct"),
    path("rooms/<int:room_id>/messages/",       ChatMessageListView.as_view(),  name="chat-messages"),
    path("rooms/<int:room_id>/upload/",         UploadChatMediaView.as_view(),  name="chat-upload"),
    path("rooms/<int:room_id>/avatar/",         UpdateChatAvatarView.as_view(), name="chat-avatar"),
]
