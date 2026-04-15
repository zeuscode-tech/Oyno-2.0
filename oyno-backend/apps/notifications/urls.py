from django.urls import path
from .views import NotificationURLPlaceholder

urlpatterns = [
    path("", NotificationURLPlaceholder.as_view(), name="notifications"),
]
