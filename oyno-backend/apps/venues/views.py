from rest_framework import generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Venue, TimeSlot, VenueReview
from .serializers import (
    VenueListSerializer, VenueDetailSerializer, VenueCreateSerializer,
    TimeSlotSerializer, VenueReviewSerializer,
)


class VenueViewSet(ModelViewSet):
    queryset = Venue.objects.filter(is_active=True).prefetch_related("images_set")
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["sport_id", "city", "type"]
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
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=["get"], url_path="my")
    def my_venues(self, request):
        qs = Venue.objects.filter(owner=request.user).prefetch_related("images_set")
        serializer = VenueDetailSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="slots")
    def slots(self, request, pk=None):
        venue = self.get_object()
        date = request.query_params.get("date")
        qs = TimeSlot.objects.filter(venue=venue)
        if date:
            qs = qs.filter(date=date)
        serializer = TimeSlotSerializer(qs, many=True)
        return Response(serializer.data)

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
