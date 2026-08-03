from django.urls import path

from .views import AnalyticsEventCreateView


urlpatterns = [
    path("events/", AnalyticsEventCreateView.as_view(), name="analytics-event-create"),
]
