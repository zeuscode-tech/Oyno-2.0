from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import User
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer,
    OTPSendSerializer, OTPVerifySerializer, UpdateProfileSerializer,
    TokenPairSerializer,
)
from .services import create_otp, verify_otp


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user: User = serializer.save()
        tokens = TokenPairSerializer.for_user(user)
        return Response(
            {"user": UserSerializer(user, context={"request": request}).data, "tokens": tokens},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user: User = serializer.validated_data["user"]

        # Сохраняем FCM токен если передан
        fcm_token = request.data.get("fcm_token", "")
        if fcm_token:
            user.fcm_token = fcm_token
            user.save(update_fields=["fcm_token"])

        tokens = TokenPairSerializer.for_user(user)
        return Response(
            {"user": UserSerializer(user, context={"request": request}).data, "tokens": tokens}
        )


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self) -> User:
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return UpdateProfileSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)


class OTPSendView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        create_otp(phone)
        return Response({"detail": "Код отправлен."})


class OTPVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        code = serializer.validated_data["code"]
        if verify_otp(phone, code):
            return Response({"verified": True})
        return Response({"verified": False, "detail": "Неверный или истёкший код."},
                        status=status.HTTP_400_BAD_REQUEST)


class FCMTokenView(APIView):
    def post(self, request):
        token = request.data.get("fcm_token", "")
        if token:
            request.user.fcm_token = token
            request.user.save(update_fields=["fcm_token"])
        return Response({"detail": "OK"})
