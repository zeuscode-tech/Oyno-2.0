from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.utils import timezone
from django.db.models import Sum, Count, Q
from datetime import timedelta

from apps.bookings.models import Booking
from .models import Venue


class OwnerDashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        period = request.query_params.get("period", "week")
        now = timezone.now()

        if period == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            prev_start = start - timedelta(days=1)
        elif period == "month":
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            prev_start = (start - timedelta(days=1)).replace(day=1)
        else:  # week
            start = now - timedelta(days=7)
            prev_start = start - timedelta(days=7)

        owner_venues = Venue.objects.filter(owner=request.user)
        venue_ids = list(owner_venues.values_list("id", flat=True))

        # Текущий период
        current_qs = Booking.objects.filter(
            venue_id__in=venue_ids,
            created_at__gte=start,
            status__in=["confirmed", "completed"],
        )
        # Предыдущий период
        prev_qs = Booking.objects.filter(
            venue_id__in=venue_ids,
            created_at__gte=prev_start,
            created_at__lt=start,
            status__in=["confirmed", "completed"],
        )

        current_revenue = current_qs.aggregate(s=Sum("total_price"))["s"] or 0
        prev_revenue = prev_qs.aggregate(s=Sum("total_price"))["s"] or 0

        current_bookings = current_qs.count()
        prev_bookings = prev_qs.count()

        # Заполненность — процент занятых слотов
        from apps.venues.models import TimeSlot
        total_slots = TimeSlot.objects.filter(venue_id__in=venue_ids, date__gte=start.date()).count()
        booked_slots = TimeSlot.objects.filter(
            venue_id__in=venue_ids, date__gte=start.date(), is_available=False
        ).count()
        occupancy = round(booked_slots / total_slots * 100) if total_slots > 0 else 0

        def pct_change(cur, prev) -> int:
            if prev == 0:
                return 100 if cur > 0 else 0
            return round((cur - prev) / prev * 100)

        return Response({
            "revenue": float(current_revenue),
            "revenue_change": pct_change(current_revenue, prev_revenue),
            "bookings": current_bookings,
            "bookings_change": pct_change(current_bookings, prev_bookings),
            "occupancy": occupancy,
            "occupancy_change": 0,  # упрощённо
            "active_venues": owner_venues.filter(is_active=True).count(),
        })


class OwnerRevenueChartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        period = request.query_params.get("period", "week")
        now = timezone.now()
        venue_ids = list(
            Venue.objects.filter(owner=request.user).values_list("id", flat=True)
        )

        if period == "week":
            labels = []
            values = []
            for i in range(6, -1, -1):
                day = (now - timedelta(days=i)).date()
                rev = (
                    Booking.objects.filter(
                        venue_id__in=venue_ids,
                        slot__date=day,
                        status__in=["confirmed", "completed"],
                    ).aggregate(s=Sum("total_price"))["s"] or 0
                )
                labels.append(day.strftime("%a"))
                values.append(float(rev))
        else:  # month — по неделям
            labels = ["Нед 1", "Нед 2", "Нед 3", "Нед 4"]
            values = []
            month_start = now.replace(day=1).date()
            for week in range(4):
                w_start = month_start + timedelta(weeks=week)
                w_end = w_start + timedelta(days=7)
                rev = (
                    Booking.objects.filter(
                        venue_id__in=venue_ids,
                        slot__date__gte=w_start,
                        slot__date__lt=w_end,
                        status__in=["confirmed", "completed"],
                    ).aggregate(s=Sum("total_price"))["s"] or 0
                )
                values.append(float(rev))

        return Response({"labels": labels, "values": values})
