from django.contrib import admin
from django.utils.html import format_html
from .models import Cryptocurrency, PriceHistory, PriceAlert, CollectionLog


@admin.register(Cryptocurrency)
class CryptocurrencyAdmin(admin.ModelAdmin):
    list_display = [
        "symbol",
        "name",
        "coingecko_id",
        "is_active",
        "display_latest_price",
        "created_at",
    ]
    list_filter = ["is_active", "created_at"]
    search_fields = ["symbol", "name", "coingecko_id"]
    ordering = ["symbol"]
    readonly_fields = ["created_at", "updated_at"]

    def display_latest_price(self, obj):
        latest = obj.latest_price
        if latest:
            return f"${latest.price_usd:,.2f}"
        return "-"
    display_latest_price.short_description = "Latest Price (USD)"


@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = [
        "cryptocurrency",
        "display_price_usd",
        "display_price_brl",
        "display_change_24h",
        "collected_at",
    ]
    list_filter = ["cryptocurrency", "collected_at"]
    search_fields = ["cryptocurrency__symbol", "cryptocurrency__name"]
    ordering = ["-collected_at"]
    date_hierarchy = "collected_at"

    def display_price_usd(self, obj):
        return f"${obj.price_usd:,.8f}"
    display_price_usd.short_description = "Price (USD)"

    def display_price_brl(self, obj):
        return f"R${obj.price_brl:,.2f}"
    display_price_brl.short_description = "Price (BRL)"

    def display_change_24h(self, obj):
        if obj.change_24h is None:
            return "-"
        color = "green" if obj.change_24h >= 0 else "red"
        arrow = "▲" if obj.change_24h >= 0 else "▼"
        return format_html(
            '<span style="color: {}">{} {:.2f}%</span>',
            color,
            arrow,
            obj.change_24h,
        )
    display_change_24h.short_description = "24h Change"


@admin.register(PriceAlert)
class PriceAlertAdmin(admin.ModelAdmin):
    list_display = [
        "cryptocurrency",
        "condition",
        "display_target_price",
        "is_active",
        "is_triggered",
        "triggered_at",
        "created_at",
    ]
    list_filter = ["condition", "is_active", "is_triggered", "cryptocurrency"]
    search_fields = ["cryptocurrency__symbol", "note"]
    ordering = ["-created_at"]
    readonly_fields = ["is_triggered", "triggered_at", "triggered_price"]

    def display_target_price(self, obj):
        return f"${obj.target_price:,.8f}"
    display_target_price.short_description = "Target Price"


@admin.register(CollectionLog)
class CollectionLogAdmin(admin.ModelAdmin):
    list_display = [
        "started_at",
        "completed_at",
        "status",
        "cryptos_processed",
        "execution_time_ms",
    ]
    list_filter = ["status", "started_at"]
    ordering = ["-started_at"]
    readonly_fields = [
        "started_at",
        "completed_at",
        "status",
        "cryptos_processed",
        "error_message",
        "execution_time_ms",
    ]
