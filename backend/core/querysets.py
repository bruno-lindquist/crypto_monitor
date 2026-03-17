"""Queryset annotation helpers for performance-sensitive endpoints."""

from django.db.models import OuterRef, Subquery

from .models import PriceHistory


def annotate_cryptocurrencies_with_latest_price(queryset):
    latest_price_queryset = PriceHistory.objects.filter(
        cryptocurrency_id=OuterRef("pk")
    ).order_by("-collected_at")

    return queryset.annotate(
        latest_price_record_id=Subquery(latest_price_queryset.values("id")[:1]),
        latest_price_usd=Subquery(latest_price_queryset.values("price_usd")[:1]),
        latest_price_brl=Subquery(latest_price_queryset.values("price_brl")[:1]),
        latest_price_is_brl_estimated=Subquery(
            latest_price_queryset.values("is_brl_estimated")[:1]
        ),
        latest_change_24h=Subquery(latest_price_queryset.values("change_24h")[:1]),
        latest_volume_24h_usd=Subquery(
            latest_price_queryset.values("volume_24h_usd")[:1]
        ),
        latest_collected_at=Subquery(latest_price_queryset.values("collected_at")[:1]),
    )
def annotate_alerts_with_current_price(queryset):
    latest_price_queryset = PriceHistory.objects.filter(
        cryptocurrency_id=OuterRef("cryptocurrency_id")
    ).order_by("-collected_at")

    return queryset.annotate(
        current_price_usd=Subquery(latest_price_queryset.values("price_usd")[:1]),
    )
