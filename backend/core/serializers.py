"""
Serializers for the Crypto Monitor API.

Handles serialization and deserialization of model instances
to/from JSON for the REST API.
"""

from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta

from .models import Cryptocurrency, PriceHistory, PriceAlert, CollectionLog


class PriceHistorySerializer(serializers.ModelSerializer):
    """Serializer for PriceHistory model."""
    
    cryptocurrency_symbol = serializers.CharField(
        source="cryptocurrency.symbol",
        read_only=True
    )
    
    class Meta:
        model = PriceHistory
        fields = [
            "id",
            "cryptocurrency",
            "cryptocurrency_symbol",
            "price_usd",
            "price_brl",
            "market_cap_usd",
            "volume_24h_usd",
            "change_1h",
            "change_24h",
            "change_7d",
            "collected_at",
        ]
        read_only_fields = ["id", "collected_at"]


class LatestPriceSerializer(serializers.ModelSerializer):
    """Compact serializer for latest price data."""
    
    class Meta:
        model = PriceHistory
        fields = [
            "price_usd",
            "price_brl",
            "change_24h",
            "volume_24h_usd",
            "collected_at",
        ]


class CryptocurrencyListSerializer(serializers.ModelSerializer):
    """Serializer for listing cryptocurrencies with their latest price."""
    
    latest_price = serializers.SerializerMethodField()
    
    class Meta:
        model = Cryptocurrency
        fields = [
            "id",
            "symbol",
            "name",
            "coingecko_id",
            "image_url",
            "is_active",
            "latest_price",
        ]
    
    def get_latest_price(self, obj):
        latest = obj.latest_price
        if latest:
            return LatestPriceSerializer(latest).data
        return None


class CryptocurrencyDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for a single cryptocurrency."""
    
    latest_price = serializers.SerializerMethodField()
    price_history_24h = serializers.SerializerMethodField()
    alerts_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Cryptocurrency
        fields = [
            "id",
            "symbol",
            "name",
            "coingecko_id",
            "image_url",
            "is_active",
            "latest_price",
            "price_history_24h",
            "alerts_count",
            "created_at",
            "updated_at",
        ]
    
    def get_latest_price(self, obj):
        latest = obj.latest_price
        if latest:
            return LatestPriceSerializer(latest).data
        return None
    
    def get_price_history_24h(self, obj):
        """Returns price history for the last 24 hours."""
        since = timezone.now() - timedelta(hours=24)
        history = obj.price_history.filter(
            collected_at__gte=since
        ).order_by("collected_at")
        return PriceHistorySerializer(history, many=True).data
    
    def get_alerts_count(self, obj):
        return {
            "active": obj.alerts.filter(is_active=True, is_triggered=False).count(),
            "triggered": obj.alerts.filter(is_triggered=True).count(),
        }


class CryptocurrencyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating cryptocurrencies."""
    
    class Meta:
        model = Cryptocurrency
        fields = [
            "id",
            "symbol",
            "name",
            "coingecko_id",
            "image_url",
            "is_active",
        ]
    
    def validate_symbol(self, value):
        """Ensure symbol is uppercase."""
        return value.upper()


class PriceAlertSerializer(serializers.ModelSerializer):
    """Serializer for PriceAlert model."""
    
    cryptocurrency_symbol = serializers.CharField(
        source="cryptocurrency.symbol",
        read_only=True
    )
    cryptocurrency_name = serializers.CharField(
        source="cryptocurrency.name",
        read_only=True
    )
    current_price = serializers.SerializerMethodField()
    distance_percent = serializers.SerializerMethodField()
    
    class Meta:
        model = PriceAlert
        fields = [
            "id",
            "cryptocurrency",
            "cryptocurrency_symbol",
            "cryptocurrency_name",
            "target_price",
            "condition",
            "note",
            "is_active",
            "is_triggered",
            "triggered_price",
            "triggered_at",
            "current_price",
            "distance_percent",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "is_triggered",
            "triggered_price",
            "triggered_at",
            "created_at",
        ]
    
    def get_current_price(self, obj):
        latest = obj.cryptocurrency.latest_price
        if latest:
            return float(latest.price_usd)
        return None
    
    def get_distance_percent(self, obj):
        """Calculate percentage distance from current price to target."""
        latest = obj.cryptocurrency.latest_price
        if latest and latest.price_usd > 0:
            current = float(latest.price_usd)
            target = float(obj.target_price)
            return round(((target - current) / current) * 100, 2)
        return None


class CollectionLogSerializer(serializers.ModelSerializer):
    """Serializer for CollectionLog model."""
    
    class Meta:
        model = CollectionLog
        fields = [
            "id",
            "started_at",
            "completed_at",
            "status",
            "cryptos_processed",
            "cryptos_failed",
            "error_message",
            "execution_time_ms",
        ]


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for dashboard statistics."""
    
    total_cryptos = serializers.IntegerField()
    active_cryptos = serializers.IntegerField()
    total_alerts = serializers.IntegerField()
    active_alerts = serializers.IntegerField()
    triggered_alerts_24h = serializers.IntegerField()
    last_collection = CollectionLogSerializer(allow_null=True)
    top_gainers = CryptocurrencyListSerializer(many=True)
    top_losers = CryptocurrencyListSerializer(many=True)
