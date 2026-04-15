from rest_framework.views import APIView
from rest_framework.response import Response
from apps.users.views import FCMTokenView  # reuse


class NotificationURLPlaceholder(APIView):
    """Placeholder — расширяй по необходимости."""

    def get(self, request):
        return Response({"detail": "OK"})
