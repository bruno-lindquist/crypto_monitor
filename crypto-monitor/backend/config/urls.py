"""
URL configuration for Crypto Monitor project.
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health_check(request):
    """Health check endpoint for container orchestration."""
    return JsonResponse({"status": "healthy", "service": "crypto-monitor-api"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("health/", health_check, name="health_check"),
]
