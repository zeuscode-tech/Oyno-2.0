from rest_framework import serializers

from .models import AnalyticsEvent


class AnalyticsEventSerializer(serializers.ModelSerializer):
    event_name = serializers.RegexField(regex=r"^[a-z0-9][a-z0-9_.-]{0,99}$")
    properties = serializers.DictField(required=False, default=dict)

    class Meta:
        model = AnalyticsEvent
        fields = ["event_name", "properties", "platform", "app_version"]
