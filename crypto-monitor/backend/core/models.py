"""
Models for Crypto Monitor application.

This module defines the data models for tracking cryptocurrency prices,
managing alerts, and storing historical price data.
"""

from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone


class Cryptocurrency(models.Model):
    """
    Represents a cryptocurrency that we're tracking.
    
    Stores basic information about the crypto and its identifier
    on external APIs (CoinGecko).
    """
    
    symbol = models.CharField(
        max_length=10,
        unique=True,
        db_index=True,
        help_text="Trading symbol (e.g., BTC, ETH)"
    )
    name = models.CharField(
        max_length=100,
        help_text="Full name (e.g., Bitcoin, Ethereum)"
    )
    coingecko_id = models.CharField(
        max_length=100,
        unique=True,
        help_text="CoinGecko API identifier"
    )
    image_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="URL for cryptocurrency logo"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether to track this cryptocurrency"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cryptocurrency"
        verbose_name_plural = "Cryptocurrencies"
        ordering = ["symbol"]

    def __str__(self):
        return f"{self.symbol} - {self.name}"

    @property
    def latest_price(self):
        """Returns the most recent price record."""
        return self.price_history.order_by("-collected_at").first()


class PriceHistory(models.Model):
    """
    Stores historical price data for cryptocurrencies.
    
    Each record represents a price snapshot at a specific point in time,
    including USD and BRL prices, 24h volume, and price change percentage.
    """
    
    cryptocurrency = models.ForeignKey(
        Cryptocurrency,
        on_delete=models.CASCADE,
        related_name="price_history"
    )
    price_usd = models.DecimalField(
        max_digits=24,
        decimal_places=8,
        validators=[MinValueValidator(0)],
        help_text="Price in USD"
    )
    price_brl = models.DecimalField(
        max_digits=24,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Price in BRL"
    )
    market_cap_usd = models.DecimalField(
        max_digits=30,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Market capitalization in USD"
    )
    volume_24h_usd = models.DecimalField(
        max_digits=30,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="24-hour trading volume in USD"
    )
    change_1h = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Price change percentage in last 1 hour"
    )
    change_24h = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Price change percentage in last 24 hours"
    )
    change_7d = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Price change percentage in last 7 days"
    )
    collected_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        help_text="Timestamp when the price was collected"
    )

    class Meta:
        verbose_name = "Price History"
        verbose_name_plural = "Price Histories"
        ordering = ["-collected_at"]
        indexes = [
            models.Index(fields=["cryptocurrency", "-collected_at"]),
            models.Index(fields=["-collected_at"]),
        ]

    def __str__(self):
        return f"{self.cryptocurrency.symbol} @ ${self.price_usd} ({self.collected_at})"


class AlertCondition(models.TextChoices):
    """Enum for alert trigger conditions."""
    ABOVE = "above", "Price goes above"
    BELOW = "below", "Price goes below"


class PriceAlert(models.Model):
    """
    Represents a price alert set by users.
    
    Alerts can be configured to trigger when a cryptocurrency's price
    goes above or below a specified target price.
    """
    
    cryptocurrency = models.ForeignKey(
        Cryptocurrency,
        on_delete=models.CASCADE,
        related_name="alerts"
    )
    target_price = models.DecimalField(
        max_digits=24,
        decimal_places=8,
        validators=[MinValueValidator(0)],
        help_text="Target price to trigger alert"
    )
    condition = models.CharField(
        max_length=10,
        choices=AlertCondition.choices,
        default=AlertCondition.ABOVE,
        help_text="Condition to trigger the alert"
    )
    note = models.TextField(
        blank=True,
        help_text="Optional note for this alert"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether this alert is active"
    )
    is_triggered = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Whether this alert has been triggered"
    )
    triggered_price = models.DecimalField(
        max_digits=24,
        decimal_places=8,
        null=True,
        blank=True,
        help_text="Price when alert was triggered"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    triggered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when alert was triggered"
    )

    class Meta:
        verbose_name = "Price Alert"
        verbose_name_plural = "Price Alerts"
        ordering = ["-created_at"]

    def __str__(self):
        status = "🔔" if not self.is_triggered else "✅"
        return f"{status} {self.cryptocurrency.symbol} {self.condition} ${self.target_price}"

    def check_trigger(self, current_price: float) -> bool:
        """
        Check if the alert should be triggered based on current price.
        
        Args:
            current_price: The current price of the cryptocurrency.
            
        Returns:
            True if the alert was triggered, False otherwise.
        """
        if self.is_triggered or not self.is_active:
            return False

        should_trigger = False
        
        if self.condition == AlertCondition.ABOVE:
            should_trigger = current_price >= float(self.target_price)
        elif self.condition == AlertCondition.BELOW:
            should_trigger = current_price <= float(self.target_price)

        if should_trigger:
            self.is_triggered = True
            self.triggered_at = timezone.now()
            self.triggered_price = current_price
            self.save(update_fields=["is_triggered", "triggered_at", "triggered_price"])

        return should_trigger


class CollectionLog(models.Model):
    """
    Logs for price collection tasks.
    
    Tracks the success/failure of each price collection run,
    useful for monitoring and debugging.
    """
    
    class Status(models.TextChoices):
        SUCCESS = "success", "Success"
        PARTIAL = "partial", "Partial Success"
        FAILED = "failed", "Failed"

    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.SUCCESS
    )
    cryptos_processed = models.PositiveIntegerField(default=0)
    cryptos_failed = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True)
    execution_time_ms = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Execution time in milliseconds"
    )

    class Meta:
        verbose_name = "Collection Log"
        verbose_name_plural = "Collection Logs"
        ordering = ["-started_at"]

    def __str__(self):
        return f"Collection {self.started_at} - {self.status}"
