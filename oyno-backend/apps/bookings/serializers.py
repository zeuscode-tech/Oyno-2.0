from rest_framework import serializers
from apps.venues.serializers import VenueListSerializer, TimeSlotSerializer
from apps.users.serializers import UserSerializer
from .models import Booking, BookingRequest


class BookingSerializer(serializers.ModelSerializer):
    venue = VenueListSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    slot = TimeSlotSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id", "venue", "user", "slot",
            "status", "payment_status", "total_price",
            "notes", "created_at",
        ]
        read_only_fields = ["id", "status", "payment_status", "total_price", "created_at"]


class BookingCreateSerializer(serializers.Serializer):
    venue_id = serializers.IntegerField()
    slot_id = serializers.IntegerField()
    payment_method_id = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs: dict) -> dict:
        from apps.venues.models import TimeSlot, Venue
        try:
            slot = TimeSlot.objects.select_related("venue").get(id=attrs["slot_id"])
        except TimeSlot.DoesNotExist:
            raise serializers.ValidationError({"slot_id": "Слот не найден."})

        if not slot.is_available:
            raise serializers.ValidationError({"slot_id": "Слот уже занят."})

        if slot.venue_id != attrs["venue_id"]:
            raise serializers.ValidationError({"slot_id": "Слот не принадлежит этой площадке."})

        attrs["slot"] = slot
        attrs["venue"] = slot.venue
        attrs["total_price"] = slot.price
        return attrs

    def create(self, validated_data: dict) -> Booking:
        return Booking.objects.create(
            user=self.context["request"].user,
            venue=validated_data["venue"],
            slot=validated_data["slot"],
            total_price=validated_data["total_price"],
            payment_method_id=validated_data["payment_method_id"],
            notes=validated_data.get("notes", ""),
        )


class BookingRequestSerializer(serializers.ModelSerializer):
    venue = VenueListSerializer(read_only=True)
    venue_id = serializers.IntegerField(write_only=True)
    customer_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=30)

    class Meta:
        model = BookingRequest
        fields = [
            "id", "venue", "venue_id", "customer_name", "phone",
            "sport_id", "preferred_date", "preferred_time",
            "players_count", "comment", "status", "created_at",
        ]
        read_only_fields = ["id", "venue", "status", "created_at"]

    def validate_venue_id(self, value: int) -> int:
        from apps.venues.models import Venue
        if not Venue.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Площадка не найдена.")
        return value

    def validate_phone(self, value: str) -> str:
        value = value.strip()
        if len(value) < 6:
            raise serializers.ValidationError("Укажите телефон или WhatsApp.")
        return value

    def create(self, validated_data: dict) -> BookingRequest:
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        venue_id = validated_data.pop("venue_id")
        return BookingRequest.objects.create(
            venue_id=venue_id,
            user=user,
            **validated_data,
        )


class BookingRequestStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingRequest
        fields = ["status"]
