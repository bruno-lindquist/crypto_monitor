"""
URL configuration for the core API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CryptocurrencyViewSet,
    PriceHistoryViewSet,
    PriceAlertViewSet,
    CollectionLogViewSet,
    DashboardView,
    ManualFetchView,
)

router = DefaultRouter()
router.register(r"cryptos", CryptocurrencyViewSet, basename="cryptocurrency")
router.register(r"prices", PriceHistoryViewSet, basename="pricehistory")
router.register(r"alerts", PriceAlertViewSet, basename="pricealert")
router.register(r"logs", CollectionLogViewSet, basename="collectionlog")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("fetch/", ManualFetchView.as_view(), name="manual-fetch"),
]
