from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User


class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "name", "phone", "avatar_url", "city",
            "role", "rank", "rating", "reliability",
            "matches_played", "date_joined",
        ]
        read_only_fields = ["id", "date_joined", "rating", "reliability", "matches_played", "rank"]

    def get_avatar_url(self, obj: User) -> str | None:
        if obj.avatar:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url
        return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["name", "phone", "password"]

    def validate_phone(self, value: str) -> str:
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Телефон уже зарегистрирован.")
        return value

    def create(self, validated_data: dict) -> User:
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    phone = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs: dict) -> dict:
        from django.contrib.auth import authenticate
        user = authenticate(username=attrs["phone"], password=attrs["password"])
        if not user:
            raise serializers.ValidationError("Неверный телефон или пароль.")
        if not user.is_active:
            raise serializers.ValidationError("Аккаунт заблокирован.")
        attrs["user"] = user
        return attrs


class TokenPairSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()

    @classmethod
    def for_user(cls, user: User) -> dict:
        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }


class AuthResponseSerializer(serializers.Serializer):
    user = UserSerializer()
    tokens = TokenPairSerializer()


class OTPSendSerializer(serializers.Serializer):
    phone = serializers.CharField()


class OTPVerifySerializer(serializers.Serializer):
    phone = serializers.CharField()
    code = serializers.CharField(max_length=6)


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["name", "city", "avatar"]
