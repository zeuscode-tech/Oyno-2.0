from rest_framework import serializers
from apps.venues.serializers import VenueListSerializer, TimeSlotSerializer
from apps.users.serializers import UserSerializer
from .models import Booking


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
