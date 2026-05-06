from rest_framework import serializers
from .models import Venue, VenueImage, TimeSlot, VenueReview


class VenueImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = VenueImage
        fields = ["id", "url", "is_main", "order"]

    def get_url(self, obj: VenueImage) -> str:
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request and obj.image else ""


class TimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSlot
        fields = ["id", "venue_id", "date", "start_time", "end_time", "price", "is_available"]
        read_only_fields = ["id"]


class VenueListSerializer(serializers.ModelSerializer):
    images = serializers.SerializerMethodField()

    class Meta:
        model = Venue
        fields = [
            "id", "name", "type", "sport_id", "address", "city",
            "lat", "lng", "rating", "reviews_count",
            "price_per_hour", "images", "is_active", "link_2gis"
        ]

    def get_images(self, obj: Venue) -> list[str]:
        request = self.context.get("request")
        imgs = obj.images_set.all()
        if request:
            return [request.build_absolute_uri(i.image.url) for i in imgs if i.image]
        return [i.image.url for i in imgs if i.image]


        


class VenueDetailSerializer(VenueListSerializer):
    working_hours = serializers.JSONField()
    amenities = serializers.JSONField()

    class Meta(VenueListSerializer.Meta):
        fields = VenueListSerializer.Meta.fields + [
            "description", "amenities", "working_hours",
        ]


class VenueCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = [
            "name", "type", "sport_id", "address", "city",
            "lat", "lng", "price_per_hour", "description",
            "amenities", "working_hours", "link_2gis"
        ]

    def create(self, validated_data: dict) -> Venue:
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)


class VenueReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.name", read_only=True)

    class Meta:
        model = VenueReview
        fields = ["id", "rating", "text", "author_name", "created_at"]
        read_only_fields = ["id", "author_name", "created_at"]

    def create(self, validated_data: dict) -> VenueReview:
        validated_data["author"] = self.context["request"].user
        validated_data["venue_id"] = self.context["venue_id"]
        return super().create(validated_data)
