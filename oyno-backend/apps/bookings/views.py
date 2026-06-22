from rest_framework import generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from django_filters.rest_framework import DjangoFilterBackend

from .models import Booking, BookingRequest
from .serializers import (
    BookingSerializer, BookingCreateSerializer,
    BookingRequestSerializer, BookingRequestStatusSerializer,
)
from apps.notifications.tasks import send_push


class BookingViewSet(GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status"]

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user).select_related(
            "venue", "slot", "user"
        )

    def create(self, request):
        serializer = BookingCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()

        # Уведомляем владельца площадки
        owner = booking.venue.owner
        if owner.fcm_token:
            send_push.delay(
                token=owner.fcm_token,
                title="Новая бронь",
                body=f"{request.user.name} забронировал «{booking.venue.name}» на {booking.slot.start_time.strftime('%H:%M')}",
                data={"type": "booking", "booking_id": str(booking.id)},
            )

        return Response(
            BookingSerializer(booking, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="my")
    def my_bookings(self, request):
        qs = self.get_queryset()
        serializer = BookingSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="owner")
    def owner_bookings(self, request):
        """Брони для владельца площадок."""
        from apps.venues.models import Venue
        venue_ids = Venue.objects.filter(owner=request.user).values_list("id", flat=True)
        qs = Booking.objects.filter(venue_id__in=venue_ids).select_related("venue", "slot", "user")

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        venue_id_filter = request.query_params.get("venue_id")
        if venue_id_filter:
            qs = qs.filter(venue_id=venue_id_filter)

        serializer = BookingSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        booking = self._get_owner_booking(pk)
        if not booking:
            return Response({"detail": "Не найдено или нет прав."}, status=status.HTTP_404_NOT_FOUND)
        booking.status = Booking.Status.CONFIRMED
        booking.save(update_fields=["status"])

        # Push пользователю
        if booking.user.fcm_token:
            send_push.delay(
                token=booking.user.fcm_token,
                title="Бронь подтверждена",
                body=f"«{booking.venue.name}» в {booking.slot.start_time.strftime('%H:%M')} — подтверждено",
                data={"type": "booking_confirmed", "booking_id": str(booking.id)},
            )

        return Response(BookingSerializer(booking, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        # Отменить может и пользователь, и владелец
        try:
            booking = Booking.objects.get(pk=pk)
        except Booking.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        is_user = booking.user == request.user
        is_owner = booking.venue.owner == request.user
        if not (is_user or is_owner):
            return Response({"detail": "Нет прав."}, status=status.HTTP_403_FORBIDDEN)

        booking.cancel()

        if is_owner and booking.user.fcm_token:
            send_push.delay(
                token=booking.user.fcm_token,
                title="Бронь отменена",
                body=f"«{booking.venue.name}» — бронь отменена владельцем",
            )

        return Response(BookingSerializer(booking, context={"request": request}).data)

    def _get_owner_booking(self, pk: int):
        from apps.venues.models import Venue
        venue_ids = Venue.objects.filter(owner=self.request.user).values_list("id", flat=True)
        return Booking.objects.filter(pk=pk, venue_id__in=venue_ids).select_related(
            "venue", "slot", "user"
        ).first()


class BookingRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = BookingRequestSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = BookingRequest.objects.select_related("venue", "user")
        if not user.is_authenticated:
            return BookingRequest.objects.none()
        if user.is_staff:
            return qs
        return qs.filter(user=user)

    def perform_create(self, serializer):
        serializer.save()


class OwnerBookingRequestListView(generics.ListAPIView):
    serializer_class = BookingRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from apps.venues.models import Venue
        venue_ids = Venue.objects.filter(owner=self.request.user).values_list("id", flat=True)
        qs = BookingRequest.objects.filter(venue_id__in=venue_ids).select_related("venue", "user")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class OwnerBookingRequestStatusView(generics.UpdateAPIView):
    serializer_class = BookingRequestStatusSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["patch"]

    def get_queryset(self):
        from apps.venues.models import Venue
        venue_ids = Venue.objects.filter(owner=self.request.user).values_list("id", flat=True)
        return BookingRequest.objects.filter(venue_id__in=venue_ids)
