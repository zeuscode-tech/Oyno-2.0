from rest_framework import generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Venue, TimeSlot, VenueReview
from .serializers import (
    VenueListSerializer, VenueDetailSerializer, VenueCreateSerializer,
    TimeSlotSerializer, VenueReviewSerializer,
)


class VenueOwnerPermission(permissions.BasePermission):
    """Only verified venue owners may manage venues."""

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "venue_owner"
        )

    def has_object_permission(self, request, view, obj: Venue) -> bool:
        return obj.owner_id == request.user.id


class VenueViewSet(ModelViewSet):
    queryset = Venue.objects.filter(
        is_active=True,
        verification_status=Venue.VerificationStatus.VERIFIED,
    ).prefetch_related("images_set")
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["city", "type"]
    search_fields = ["name", "address"]
    ordering_fields = ["rating", "price_per_hour"]
    ordering = ["-rating"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return VenueDetailSerializer
        if self.action in ("create", "update", "partial_update"):
            return VenueCreateSerializer
        return VenueListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("VALIDATION ERRORS:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        venue = serializer.save()
        
       
        images = request.FILES.getlist('images')
        from .models import VenueImage
        for idx, img in enumerate(images):
            VenueImage.objects.create(
                venue=venue,
                image=img,
                is_main=(idx == 0),
                order=idx
            )
            
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticatedOrReadOnly()]
        if self.action == "slots" and self.request.method == "GET":
            return [permissions.IsAuthenticatedOrReadOnly()]
        if self.action == "reviews":
            return [permissions.IsAuthenticatedOrReadOnly()]
        return [VenueOwnerPermission()]

    def get_queryset(self):
        queryset = super().get_queryset()
        owner_actions = ("update", "partial_update", "destroy", "request_verification", "images")
        if self.action in owner_actions or (self.action == "slots" and self.request.method != "GET"):
            queryset = Venue.objects.filter(owner=self.request.user).prefetch_related("images_set")
        elif self.action == "slots" and getattr(self.request.user, "is_authenticated", False):
            queryset = queryset | Venue.objects.filter(owner=self.request.user)
        sport_id = self.request.query_params.get("sport_id")
        if sport_id:
            queryset = queryset.filter(
                Q(sport_id=sport_id) | Q(sport_ids__contains=[sport_id])
            ).distinct()
        return queryset

    @action(detail=False, methods=["get"], url_path="my")
    def my_venues(self, request):
        self.check_permissions(request)
        qs = Venue.objects.filter(owner=request.user).prefetch_related("images_set")
        serializer = VenueDetailSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"], url_path="slots")
    def slots(self, request, pk=None):
        venue = self.get_object()
        if request.method == "POST":
            serializer = TimeSlotSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(venue=venue)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        date = request.query_params.get("date")
        qs = TimeSlot.objects.filter(venue=venue)
        if date:
            qs = qs.filter(date=date)
        serializer = TimeSlotSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="request-verification")
    def request_verification(self, request, pk=None):
        venue = self.get_object()
        if request.user.phone_verified_at is None:
            return Response(
                {"detail": "Сначала подтвердите номер телефона владельца."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not venue.address.strip():
            return Response({"detail": "Address is required before verification."}, status=status.HTTP_400_BAD_REQUEST)
        venue.verification_status = Venue.VerificationStatus.PENDING
        venue.is_active = False
        venue.save(update_fields=["verification_status", "is_active"])
        return Response(VenueDetailSerializer(venue, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="images")
    def images(self, request, pk=None):
        venue = self.get_object()
        images = request.FILES.getlist("images")
        if not images:
            return Response({"detail": "At least one image is required."}, status=status.HTTP_400_BAD_REQUEST)

        from .models import VenueImage

        current_max = venue.images_set.order_by("-order").values_list("order", flat=True).first()
        start_order = (current_max + 1) if current_max is not None else 0
        for index, image in enumerate(images):
            VenueImage.objects.create(
                venue=venue,
                image=image,
                is_main=(start_order == 0 and index == 0),
                order=start_order + index,
            )

        venue.refresh_from_db()
        return Response(VenueDetailSerializer(venue, context={"request": request}).data)

    @action(detail=True, methods=["get", "post"], url_path="reviews")
    def reviews(self, request, pk=None):
        venue = self.get_object()
        if request.method == "GET":
            qs = VenueReview.objects.filter(venue=venue).select_related("author")
            serializer = VenueReviewSerializer(qs, many=True, context={"request": request})
            return Response(serializer.data)

        serializer = VenueReviewSerializer(
            data=request.data,
            context={"request": request, "venue_id": venue.pk},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
