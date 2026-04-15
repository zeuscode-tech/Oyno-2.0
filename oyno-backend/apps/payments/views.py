from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import PaymentMethod, Payment
from .serializers import PaymentMethodSerializer, InitiatePaymentSerializer, ConfirmPaymentSerializer
from .services import initiate_mbank_payment, confirm_mbank_payment


class PaymentMethodListView(generics.ListCreateAPIView):
    serializer_class = PaymentMethodSerializer

    def get_queryset(self):
        return PaymentMethod.objects.filter(user=self.request.user)


class InitiatePaymentView(APIView):
    def post(self, request):
        serializer = InitiatePaymentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        booking = serializer.validated_data["booking"]
        method = serializer.validated_data["method"]

        # Создаём запись Payment
        payment = Payment.objects.create(
            booking=booking,
            method=method,
            amount=booking.total_price,
            gateway="mbank",
        )

        result = initiate_mbank_payment(
            payment_id=payment.id,
            amount=float(booking.total_price),
            card_token=method.token,
            description=f"OYNO бронь #{booking.id}",
        )

        payment.gateway_payment_id = result.get("gateway_payment_id", "")
        if result["status"] == "success":
            payment.status = Payment.Status.SUCCESS
            booking.payment_status = "paid"
            booking.save(update_fields=["payment_status"])
        payment.save(update_fields=["gateway_payment_id", "status"])

        return Response({
            "payment_id": str(payment.id),
            "status": result["status"],
            "redirect_url": result.get("redirect_url"),
        })


class ConfirmPaymentView(APIView):
    def post(self, request):
        serializer = ConfirmPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment_id = serializer.validated_data["payment_id"]
        otp = serializer.validated_data.get("otp")

        try:
            payment = Payment.objects.select_related("booking").get(
                id=payment_id,
                booking__user=request.user,
            )
        except Payment.DoesNotExist:
            return Response({"detail": "Платёж не найден."}, status=status.HTTP_404_NOT_FOUND)

        result = confirm_mbank_payment(payment.gateway_payment_id, otp)

        if result["status"] == "success":
            payment.status = Payment.Status.SUCCESS
            payment.save(update_fields=["status"])
            payment.booking.payment_status = "paid"
            payment.booking.status = "confirmed"
            payment.booking.save(update_fields=["payment_status", "status"])

        return Response({"status": result["status"]})
