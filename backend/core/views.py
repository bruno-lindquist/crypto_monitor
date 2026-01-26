"""
Views for the Crypto Monitor API.

Implements REST API endpoints for cryptocurrencies, price history,
alerts, and dashboard statistics.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import models
from django.utils import timezone
from django.db.models import Prefetch, Subquery, OuterRef
from datetime import timedelta

from .models import Cryptocurrency, PriceHistory, PriceAlert, CollectionLog
from .serializers import (
    CryptocurrencyListSerializer,
    CryptocurrencyDetailSerializer,
    CryptocurrencyCreateSerializer,
    PriceHistorySerializer,
    PriceAlertSerializer,
    CollectionLogSerializer,
    DashboardStatsSerializer,
)
from .tasks import fetch_crypto_prices, fetch_single_crypto


class CryptocurrencyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing cryptocurrencies.
    
    Endpoints:
    - GET /api/cryptos/ - List all cryptocurrencies
    - POST /api/cryptos/ - Create a new cryptocurrency
    - GET /api/cryptos/{id}/ - Retrieve a cryptocurrency
    - PUT /api/cryptos/{id}/ - Update a cryptocurrency
    - DELETE /api/cryptos/{id}/ - Delete a cryptocurrency
    - POST /api/cryptos/{id}/refresh/ - Manually refresh price
    - GET /api/cryptos/{id}/history/ - Get price history
    """
    
    queryset = Cryptocurrency.objects.all()
    
    def get_serializer_class(self):
        if self.action == "list":
            return CryptocurrencyListSerializer
        elif self.action == "retrieve":
            return CryptocurrencyDetailSerializer
        return CryptocurrencyCreateSerializer
    
    def get_queryset(self):
        queryset = Cryptocurrency.objects.all()
        
        # Filter by active status
        is_active = self.request.query_params.get("active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")
        
        # Search by symbol or name
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                models.Q(symbol__icontains=search) |
                models.Q(name__icontains=search)
            )
        
        return queryset.order_by("symbol")
    
    @action(detail=True, methods=["post"])
    def refresh(self, request, pk=None):
        """Manually trigger a price refresh for this cryptocurrency."""
        crypto = self.get_object()
        task = fetch_single_crypto.delay(crypto.id)
        return Response({
            "message": f"Price refresh queued for {crypto.symbol}",
            "task_id": task.id,
        })
    
    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        """Get price history for this cryptocurrency."""
        crypto = self.get_object()
        
        # Get time range from query params (default: 24 hours)
        hours = int(request.query_params.get("hours", 24))
        hours = min(hours, 168)  # Max 7 days
        
        since = timezone.now() - timedelta(hours=hours)
        history = PriceHistory.objects.filter(
            cryptocurrency=crypto,
            collected_at__gte=since,
        ).order_by("collected_at")
        
        serializer = PriceHistorySerializer(history, many=True)
        return Response(serializer.data)


class PriceHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing price history.
    
    Endpoints:
    - GET /api/prices/ - List price history (filterable)
    - GET /api/prices/{id}/ - Retrieve a specific price record
    """
    
    serializer_class = PriceHistorySerializer
    
    def get_queryset(self):
        queryset = PriceHistory.objects.all()
        
        # Filter by cryptocurrency
        crypto_id = self.request.query_params.get("crypto")
        if crypto_id:
            queryset = queryset.filter(cryptocurrency_id=crypto_id)
        
        crypto_symbol = self.request.query_params.get("symbol")
        if crypto_symbol:
            queryset = queryset.filter(
                cryptocurrency__symbol__iexact=crypto_symbol
            )
        
        # Filter by time range
        hours = self.request.query_params.get("hours")
        if hours:
            since = timezone.now() - timedelta(hours=int(hours))
            queryset = queryset.filter(collected_at__gte=since)
        
        # Limit results
        limit = self.request.query_params.get("limit")
        if limit:
            queryset = queryset[:int(limit)]
        
        return queryset.select_related("cryptocurrency").order_by("-collected_at")


class PriceAlertViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing price alerts.
    
    Endpoints:
    - GET /api/alerts/ - List all alerts
    - POST /api/alerts/ - Create a new alert
    - GET /api/alerts/{id}/ - Retrieve an alert
    - PUT /api/alerts/{id}/ - Update an alert
    - DELETE /api/alerts/{id}/ - Delete an alert
    - POST /api/alerts/{id}/reset/ - Reset a triggered alert
    """
    
    serializer_class = PriceAlertSerializer
    
    def get_queryset(self):
        queryset = PriceAlert.objects.all()
        
        # Filter by cryptocurrency
        crypto_id = self.request.query_params.get("crypto")
        if crypto_id:
            queryset = queryset.filter(cryptocurrency_id=crypto_id)
        
        # Filter by status
        is_triggered = self.request.query_params.get("triggered")
        if is_triggered is not None:
            queryset = queryset.filter(is_triggered=is_triggered.lower() == "true")
        
        is_active = self.request.query_params.get("active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")
        
        return queryset.select_related("cryptocurrency").order_by("-created_at")
    
    @action(detail=True, methods=["post"])
    def reset(self, request, pk=None):
        """Reset a triggered alert to active state."""
        alert = self.get_object()
        alert.is_triggered = False
        alert.triggered_at = None
        alert.triggered_price = None
        alert.is_active = True
        alert.save()
        
        serializer = self.get_serializer(alert)
        return Response(serializer.data)


class CollectionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing collection logs.
    
    Endpoints:
    - GET /api/logs/ - List collection logs
    - GET /api/logs/{id}/ - Retrieve a specific log
    """
    
    queryset = CollectionLog.objects.all().order_by("-started_at")
    serializer_class = CollectionLogSerializer


class DashboardView(APIView):
    """
    API view for dashboard statistics.
    
    Endpoints:
    - GET /api/dashboard/ - Get dashboard stats
    """
    
    def get(self, request):
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        
        # Get basic counts
        total_cryptos = Cryptocurrency.objects.count()
        active_cryptos = Cryptocurrency.objects.filter(is_active=True).count()
        total_alerts = PriceAlert.objects.count()
        active_alerts = PriceAlert.objects.filter(
            is_active=True, is_triggered=False
        ).count()
        triggered_alerts_24h = PriceAlert.objects.filter(
            triggered_at__gte=last_24h
        ).count()
        
        # Get last collection log
        last_collection = CollectionLog.objects.first()
        
        # Get top gainers and losers (last 24h)
        # Subquery to get the latest price for each crypto
        latest_price_subquery = PriceHistory.objects.filter(
            cryptocurrency=OuterRef("pk")
        ).order_by("-collected_at").values("change_24h")[:1]
        
        cryptos_with_change = Cryptocurrency.objects.filter(
            is_active=True
        ).annotate(
            latest_change=Subquery(latest_price_subquery)
        ).exclude(
            latest_change__isnull=True
        )
        
        top_gainers = list(
            cryptos_with_change.order_by("-latest_change")[:5]
        )
        top_losers = list(
            cryptos_with_change.order_by("latest_change")[:5]
        )
        
        data = {
            "total_cryptos": total_cryptos,
            "active_cryptos": active_cryptos,
            "total_alerts": total_alerts,
            "active_alerts": active_alerts,
            "triggered_alerts_24h": triggered_alerts_24h,
            "last_collection": last_collection,
            "top_gainers": top_gainers,
            "top_losers": top_losers,
        }
        
        serializer = DashboardStatsSerializer(data)
        return Response(serializer.data)


class ManualFetchView(APIView):
    """
    API view to manually trigger price collection.
    
    Endpoints:
    - POST /api/fetch/ - Trigger manual price collection
    """
    
    def post(self, request):
        task = fetch_crypto_prices.delay()
        return Response({
            "message": "Price collection task queued",
            "task_id": task.id,
        }, status=status.HTTP_202_ACCEPTED)
