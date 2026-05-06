from rest_framework import serializers
from .models import PaymentMethod, Payment


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ["id", "type", "last4", "label", "is_default"]
        read_only_fields = ["id"]

    def create(self, validated_data: dict) -> PaymentMethod:
        validated_data["user"] = self.context["request"].user
        # При первой карте — делаем её дефолтной
        if not PaymentMethod.objects.filter(user=validated_data["user"]).exists():
            validated_data["is_default"] = True
        return super().create(validated_data)


class InitiatePaymentSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
    method_id = serializers.CharField()

    def validate(self, attrs: dict) -> dict:
        from apps.bookings.models import Booking
        try:
            booking = Booking.objects.get(
                id=attrs["booking_id"],
                user=self.context["request"].user,
            )
        except Booking.DoesNotExist:
            raise serializers.ValidationError({"booking_id": "Бронь не найдена."})

        try:
            method = PaymentMethod.objects.get(
                id=attrs["method_id"],
                user=self.context["request"].user,
            )
        except PaymentMethod.DoesNotExist:
            raise serializers.ValidationError({"method_id": "Способ оплаты не найден."})

        attrs["booking"] = booking
        attrs["method"] = method
        return attrs


class ConfirmPaymentSerializer(serializers.Serializer):
    payment_id = serializers.CharField()
    otp = serializers.CharField(required=False, allow_blank=True)
