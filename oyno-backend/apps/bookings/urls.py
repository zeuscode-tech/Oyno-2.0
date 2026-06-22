from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BookingViewSet,
    BookingRequestListCreateView,
    OwnerBookingRequestListView,
    OwnerBookingRequestStatusView,
)

router = DefaultRouter()
router.register("", BookingViewSet, basename="booking")

urlpatterns = [
    path("requests/", BookingRequestListCreateView.as_view(), name="booking-requests"),
    path("requests/owner/", OwnerBookingRequestListView.as_view(), name="owner-booking-requests"),
    path("requests/owner/<int:pk>/", OwnerBookingRequestStatusView.as_view(), name="owner-booking-request-status"),
    path("", include(router.urls)),
]
