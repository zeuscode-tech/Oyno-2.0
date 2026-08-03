from rest_framework import generics, permissions

from .serializers import AnalyticsEventSerializer


class AnalyticsEventCreateView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AnalyticsEventSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
