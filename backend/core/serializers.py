"""
Serializers for the Crypto Monitor API.

Handles serialization and deserialization of model instances
to/from JSON for the REST API.
"""

from rest_framework import serializers

from .models import Cryptocurrency, PriceHistory, PriceAlert, CollectionLog


def build_latest_price_payload(obj):
    """Return the latest price payload from annotations or model fallback."""
    annotated_price_id = getattr(obj, "latest_price_record_id", None)
    if annotated_price_id is not None:
        return {
            "price_usd": obj.latest_price_usd,
            "price_brl": obj.latest_price_brl,
            "is_brl_estimated": obj.latest_price_is_brl_estimated,
            "change_24h": obj.latest_change_24h,
            "volume_24h_usd": obj.latest_volume_24h_usd,
            "collected_at": obj.latest_collected_at,
        }

    latest = obj.latest_price
    if latest:
        return latest
    return None


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
            "is_brl_estimated",
            "market_cap_usd",
            "volume_24h_usd",
            "change_1h",
            "change_24h",
            "change_7d",
            "collected_at",
        ]
        read_only_fields = ["id", "collected_at"]


class LatestPriceSerializer(serializers.Serializer):
    """Compact serializer for latest price data."""

    price_usd = serializers.DecimalField(max_digits=24, decimal_places=8)
    price_brl = serializers.DecimalField(max_digits=24, decimal_places=2)
    is_brl_estimated = serializers.BooleanField()
    change_24h = serializers.DecimalField(
        max_digits=10, decimal_places=4, allow_null=True
    )
    volume_24h_usd = serializers.DecimalField(
        max_digits=30, decimal_places=2, allow_null=True
    )
    collected_at = serializers.DateTimeField()


class CryptocurrencyListQuerySerializer(serializers.Serializer):
    """Validation for cryptocurrency list query params."""

    active = serializers.BooleanField(required=False)
    search = serializers.CharField(required=False, allow_blank=True, max_length=100)


class CryptocurrencyHistoryQuerySerializer(serializers.Serializer):
    """Validation for cryptocurrency history query params."""

    hours = serializers.IntegerField(required=False, default=24, min_value=1, max_value=168)


class PriceHistoryQuerySerializer(serializers.Serializer):
    """Validation for price history list query params."""

    crypto = serializers.IntegerField(required=False, min_value=1)
    symbol = serializers.CharField(required=False, allow_blank=True, max_length=10)
    hours = serializers.IntegerField(required=False, min_value=1, max_value=168)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=500)


class PriceAlertQuerySerializer(serializers.Serializer):
    """Validation for alert list query params."""

    crypto = serializers.IntegerField(required=False, min_value=1)
    triggered = serializers.BooleanField(required=False)
    active = serializers.BooleanField(required=False)


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
        latest = build_latest_price_payload(obj)
        if latest:
            return LatestPriceSerializer(latest).data
        return None


class CryptocurrencyDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for a single cryptocurrency."""
    
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
            "created_at",
            "updated_at",
        ]
    
    def get_latest_price(self, obj):
        latest = build_latest_price_payload(obj)
        if latest:
            return LatestPriceSerializer(latest).data
        return None


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
        current_price = getattr(obj, "current_price_usd", None)
        if current_price is not None:
            return float(current_price)

        latest = obj.cryptocurrency.latest_price
        if latest:
            return float(latest.price_usd)
        return None
    
    def get_distance_percent(self, obj):
        """Calculate percentage distance from current price to target."""
        current_price = getattr(obj, "current_price_usd", None)
        if current_price is not None and current_price > 0:
            current = float(current_price)
            target = float(obj.target_price)
            return round(((target - current) / current) * 100, 2)

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
