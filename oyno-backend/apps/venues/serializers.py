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
        read_only_fields = ["id", "venue_id"]

    def validate(self, attrs: dict) -> dict:
        start_time = attrs.get("start_time")
        end_time = attrs.get("end_time")
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({"end_time": "End time must be later than start time."})
        return attrs


class VenueListSerializer(serializers.ModelSerializer):
    images = serializers.SerializerMethodField()
    phones = serializers.ListField(source="source_phones", read_only=True)

    class Meta:
        model = Venue
        fields = [
            "id", "name", "type", "sport_id", "sport_ids", "address", "city",
            "lat", "lng", "rating", "reviews_count",
            "price_per_hour", "images", "is_active", "link_2gis", "phones",
            "verification_status",
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
            "description", "amenities", "working_hours", "source_photo_urls",
            "source_phone_note",
        ]


class VenueCreateSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    sport_ids = serializers.ListField(
        child=serializers.ChoiceField(choices=[choice.value for choice in Venue.SportId]),
        required=False,
        allow_empty=False,
    )

    class Meta:
        model = Venue
        fields = [
            "name", "type", "sport_id", "address", "city",
            "sport_ids",
            "lat", "lng", "price_per_hour", "description",
            "amenities", "working_hours", "link_2gis", "phone"
        ]

    def create(self, validated_data: dict) -> Venue:
        sport_ids = validated_data.pop("sport_ids", None)
        phone = validated_data.pop("phone", "").strip()
        validated_data["owner"] = self.context["request"].user
        validated_data["verification_status"] = Venue.VerificationStatus.PENDING
        validated_data["is_active"] = False
        validated_data["source_phones"] = [phone] if phone else []
        venue = super().create(validated_data)
        venue.sport_ids = sport_ids or [venue.sport_id]
        venue.save(update_fields=["sport_ids"])
        return venue

    def update(self, instance: Venue, validated_data: dict) -> Venue:
        sport_ids = validated_data.pop("sport_ids", None)
        phone = validated_data.pop("phone", None)
        venue = super().update(instance, validated_data)
        if phone is not None:
            venue.source_phones = [phone.strip()] if phone.strip() else []
            venue.save(update_fields=["source_phones"])
        if sport_ids is not None:
            venue.sport_ids = sport_ids
            venue.sport_id = sport_ids[0]
            venue.save(update_fields=["sport_ids", "sport_id"])
        elif "sport_id" in validated_data:
            venue.sport_ids = [venue.sport_id]
            venue.save(update_fields=["sport_ids"])
        return venue


class VenueReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.name", read_only=True)
    rating = serializers.IntegerField(min_value=1, max_value=5)

    class Meta:
        model = VenueReview
        fields = ["id", "rating", "text", "author_name", "created_at"]
        read_only_fields = ["id", "author_name", "created_at"]

    def create(self, validated_data: dict) -> VenueReview:
        validated_data["author"] = self.context["request"].user
        validated_data["venue_id"] = self.context["venue_id"]
        return super().create(validated_data)
