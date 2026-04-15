from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),

    # API v1
    path("api/v1/auth/",          include("apps.users.urls")),
    path("api/v1/venues/",        include("apps.venues.urls")),
    path("api/v1/games/",         include("apps.games.urls")),
    path("api/v1/chats/",         include("apps.chats.urls")),
    path("api/v1/bookings/",      include("apps.bookings.urls")),
    path("api/v1/payments/",      include("apps.payments.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),

    # Owner CRM (stats)
    path("api/v1/owner/",         include("apps.venues.owner_urls")),

    # OpenAPI docs
    path("api/schema/",           SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/",             SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
