"""
Views for the Crypto Monitor API.

Implements REST API endpoints for cryptocurrencies, price history,
alerts, and dashboard statistics.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from django.db import models
from django.utils import timezone
from datetime import timedelta

from .access import filter_alerts_for_request, get_alert_token_hash_for_request
from .models import Cryptocurrency, PriceHistory, PriceAlert, CollectionLog
from .querysets import (
    annotate_alerts_with_current_price,
    annotate_cryptocurrencies_with_latest_price,
)
from .serializers import (
    CryptocurrencyListSerializer,
    CryptocurrencyDetailSerializer,
    CryptocurrencyCreateSerializer,
    CryptocurrencyListQuerySerializer,
    CryptocurrencyHistoryQuerySerializer,
    PriceHistoryQuerySerializer,
    PriceAlertQuerySerializer,
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

    def get_permissions(self):
        if self.action in {"list", "retrieve", "history"}:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]

    def get_throttles(self):
        if self.action == "refresh":
            self.throttle_scope = "manual-fetch"
            return [ScopedRateThrottle()]
        return super().get_throttles()
    
    def get_serializer_class(self):
        if self.action == "list":
            return CryptocurrencyListSerializer
        elif self.action == "retrieve":
            return CryptocurrencyDetailSerializer
        return CryptocurrencyCreateSerializer
    
    def get_queryset(self):
        params = CryptocurrencyListQuerySerializer(data=self.request.query_params.dict())
        params.is_valid(raise_exception=True)

        queryset = annotate_cryptocurrencies_with_latest_price(
            Cryptocurrency.objects.all()
        )
        validated = params.validated_data
        
        # Filter by active status
        if "active" in validated:
            queryset = queryset.filter(is_active=validated["active"])
        
        # Search by symbol or name
        search = validated.get("search")
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
        params = CryptocurrencyHistoryQuerySerializer(data=request.query_params.dict())
        params.is_valid(raise_exception=True)
        
        # Get time range from query params (default: 24 hours)
        hours = params.validated_data["hours"]
        
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
        params = PriceHistoryQuerySerializer(data=self.request.query_params.dict())
        params.is_valid(raise_exception=True)

        queryset = PriceHistory.objects.all()
        validated = params.validated_data
        
        # Filter by cryptocurrency
        crypto_id = validated.get("crypto")
        if crypto_id:
            queryset = queryset.filter(cryptocurrency_id=crypto_id)
        
        crypto_symbol = validated.get("symbol")
        if crypto_symbol:
            queryset = queryset.filter(
                cryptocurrency__symbol__iexact=crypto_symbol
            )
        
        # Filter by time range
        hours = validated.get("hours")
        if hours:
            since = timezone.now() - timedelta(hours=hours)
            queryset = queryset.filter(collected_at__gte=since)

        queryset = queryset.select_related("cryptocurrency").order_by("-collected_at")
        
        # Limit results
        limit = validated.get("limit")
        if limit:
            queryset = queryset[:limit]
        
        return queryset


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

    def get_permissions(self):
        if self.action in {"list", "retrieve", "create", "update", "partial_update", "destroy", "reset"}:
            from .access import HasAlertClientTokenOrAdmin

            permission_classes = [HasAlertClientTokenOrAdmin]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]

    def get_throttles(self):
        if self.action == "create":
            self.throttle_scope = "alert-create"
            return [ScopedRateThrottle()]

        if self.action in {"update", "partial_update", "destroy", "reset"}:
            self.throttle_scope = "alert-manage"
            return [ScopedRateThrottle()]

        return super().get_throttles()
    
    def get_queryset(self):
        params = PriceAlertQuerySerializer(data=self.request.query_params.dict())
        params.is_valid(raise_exception=True)

        queryset = filter_alerts_for_request(
            PriceAlert.objects.all(),
            self.request,
        )
        queryset = annotate_alerts_with_current_price(queryset)
        validated = params.validated_data
        
        # Filter by cryptocurrency
        crypto_id = validated.get("crypto")
        if crypto_id:
            queryset = queryset.filter(cryptocurrency_id=crypto_id)
        
        # Filter by status
        if "triggered" in validated:
            queryset = queryset.filter(is_triggered=validated["triggered"])
        
        if "active" in validated:
            queryset = queryset.filter(is_active=validated["active"])
        
        return queryset.select_related("cryptocurrency").order_by("-created_at")

    def perform_create(self, serializer):
        owner_token_hash = get_alert_token_hash_for_request(self.request)
        serializer.save(owner_token_hash=owner_token_hash)
    
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
    permission_classes = [IsAdminUser]


class DashboardView(APIView):
    """
    API view for dashboard statistics.
    
    Endpoints:
    - GET /api/dashboard/ - Get dashboard stats
    """
    
    permission_classes = [AllowAny]

    def get(self, request):
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        alerts_queryset = filter_alerts_for_request(PriceAlert.objects.all(), request)
        
        # Get basic counts
        total_cryptos = Cryptocurrency.objects.count()
        active_cryptos = Cryptocurrency.objects.filter(is_active=True).count()
        total_alerts = alerts_queryset.count()
        active_alerts = alerts_queryset.filter(
            is_active=True, is_triggered=False
        ).count()
        triggered_alerts_24h = alerts_queryset.filter(
            triggered_at__gte=last_24h
        ).count()
        
        # Get last collection log
        last_collection = CollectionLog.objects.first()
        
        # Get top gainers and losers (last 24h)
        cryptos_with_change = annotate_cryptocurrencies_with_latest_price(
            Cryptocurrency.objects.filter(
            is_active=True
            )
        ).exclude(
            latest_change_24h__isnull=True
        )
        
        top_gainers = list(
            cryptos_with_change.order_by("-latest_change_24h")[:5]
        )
        top_losers = list(
            cryptos_with_change.order_by("latest_change_24h")[:5]
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
    
    permission_classes = [IsAdminUser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "manual-fetch"

    def post(self, request):
        task = fetch_crypto_prices.delay()
        return Response({
            "message": "Price collection task queued",
            "task_id": task.id,
        }, status=status.HTTP_202_ACCEPTED)
