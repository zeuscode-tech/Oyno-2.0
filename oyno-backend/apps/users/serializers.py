from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User


class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "name", "username", "phone", "avatar", "city", "bio",
            "role", "rank", "skill_level", "main_sport",
            "rating", "reliability", "matches_played", "date_joined",
        ]
        read_only_fields = ["id", "date_joined", "rating", "reliability", "matches_played", "rank"]

    def get_avatar(self, obj: User) -> str | None:
        if obj.avatar:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url
        return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(
        choices=User.Role.choices,
        default=User.Role.PLAYER,
        required=False,
    )

    class Meta:
        model = User
        fields = ["name", "phone", "password", "role"]

    def validate_phone(self, value: str) -> str:
        role = self.initial_data.get("role", "player")
        existing = User.objects.filter(phone=value).first()
        if existing and existing.role == role:
            raise serializers.ValidationError("Этот номер уже зарегистрирован для данной роли.")
        return value

    def create(self, validated_data: dict) -> User:
        # Same phone, different role → update existing user's role
        existing = User.objects.filter(phone=validated_data["phone"]).first()
        if existing:
            existing.role = validated_data.get("role", existing.role)
            existing.name = validated_data.get("name", existing.name)
            if validated_data.get("password"):
                existing.set_password(validated_data["password"])
            existing.save(update_fields=["role", "name", "password"])
            return existing
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


class PasswordResetRequestSerializer(serializers.Serializer):
    phone = serializers.CharField()

    def validate_phone(self, value: str) -> str:
        if not User.objects.filter(phone=value, is_active=True).exists():
            raise serializers.ValidationError("Пользователь с таким номером не найден.")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    phone = serializers.CharField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=8, write_only=True)


class UpdateProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        required=False, allow_null=True, allow_blank=True, max_length=50
    )

    class Meta:
        model = User
        fields = ["name", "username", "city", "avatar", "bio", "skill_level", "main_sport"]

    def validate_username(self, value):
        import re
        if not value:
            return None
        value = value.lower()
        if not re.match(r'^[a-z0-9_.]{3,50}$', value):
            raise serializers.ValidationError(
                "Только буквы a-z, цифры, точка и подчёркивание. Минимум 3 символа."
            )
        qs = User.objects.filter(username=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Этот username уже занят.")
        return value
