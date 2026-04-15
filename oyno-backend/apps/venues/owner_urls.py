from django.urls import path
from .owner_views import OwnerDashboardStatsView, OwnerRevenueChartView

urlpatterns = [
    path("stats/",          OwnerDashboardStatsView.as_view(), name="owner-stats"),
    path("revenue-chart/",  OwnerRevenueChartView.as_view(),   name="owner-revenue-chart"),
]
