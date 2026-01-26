"""
Tests for the Crypto Monitor application.
"""

import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

from core.models import (
    Cryptocurrency,
    PriceHistory,
    PriceAlert,
    AlertCondition,
)


@pytest.fixture
def bitcoin():
    """Create a Bitcoin cryptocurrency for testing."""
    return Cryptocurrency.objects.create(
        symbol="BTC",
        name="Bitcoin",
        coingecko_id="bitcoin",
        is_active=True,
    )


@pytest.fixture
def ethereum():
    """Create an Ethereum cryptocurrency for testing."""
    return Cryptocurrency.objects.create(
        symbol="ETH",
        name="Ethereum",
        coingecko_id="ethereum",
        is_active=True,
    )


@pytest.fixture
def btc_price(bitcoin):
    """Create a price history record for Bitcoin."""
    return PriceHistory.objects.create(
        cryptocurrency=bitcoin,
        price_usd=Decimal("50000.00"),
        price_brl=Decimal("250000.00"),
        change_24h=Decimal("2.5"),
        volume_24h_usd=Decimal("1000000000"),
    )


@pytest.mark.django_db
class TestCryptocurrency:
    """Tests for Cryptocurrency model."""
    
    def test_create_cryptocurrency(self):
        """Test creating a cryptocurrency."""
        crypto = Cryptocurrency.objects.create(
            symbol="BTC",
            name="Bitcoin",
            coingecko_id="bitcoin",
        )
        
        assert crypto.symbol == "BTC"
        assert crypto.name == "Bitcoin"
        assert crypto.is_active is True
        assert str(crypto) == "BTC - Bitcoin"
    
    def test_latest_price_property(self, bitcoin):
        """Test the latest_price property."""
        assert bitcoin.latest_price is None
        
        # Create some price history
        PriceHistory.objects.create(
            cryptocurrency=bitcoin,
            price_usd=Decimal("49000"),
            price_brl=Decimal("245000"),
            collected_at=timezone.now() - timedelta(hours=1),
        )
        
        latest = PriceHistory.objects.create(
            cryptocurrency=bitcoin,
            price_usd=Decimal("50000"),
            price_brl=Decimal("250000"),
        )
        
        assert bitcoin.latest_price == latest


@pytest.mark.django_db
class TestPriceHistory:
    """Tests for PriceHistory model."""
    
    def test_create_price_history(self, bitcoin):
        """Test creating a price history record."""
        price = PriceHistory.objects.create(
            cryptocurrency=bitcoin,
            price_usd=Decimal("50000.12345678"),
            price_brl=Decimal("250000.50"),
            change_24h=Decimal("2.5"),
        )
        
        assert price.cryptocurrency == bitcoin
        assert price.price_usd == Decimal("50000.12345678")
        assert price.collected_at is not None
    
    def test_price_history_ordering(self, bitcoin):
        """Test that price history is ordered by collected_at desc."""
        old_price = PriceHistory.objects.create(
            cryptocurrency=bitcoin,
            price_usd=Decimal("49000"),
            price_brl=Decimal("245000"),
            collected_at=timezone.now() - timedelta(hours=1),
        )
        
        new_price = PriceHistory.objects.create(
            cryptocurrency=bitcoin,
            price_usd=Decimal("50000"),
            price_brl=Decimal("250000"),
        )
        
        prices = list(PriceHistory.objects.all())
        assert prices[0] == new_price
        assert prices[1] == old_price


@pytest.mark.django_db
class TestPriceAlert:
    """Tests for PriceAlert model."""
    
    def test_create_alert(self, bitcoin):
        """Test creating a price alert."""
        alert = PriceAlert.objects.create(
            cryptocurrency=bitcoin,
            target_price=Decimal("55000"),
            condition=AlertCondition.ABOVE,
        )
        
        assert alert.cryptocurrency == bitcoin
        assert alert.is_active is True
        assert alert.is_triggered is False
    
    def test_check_trigger_above(self, bitcoin):
        """Test triggering an alert when price goes above target."""
        alert = PriceAlert.objects.create(
            cryptocurrency=bitcoin,
            target_price=Decimal("50000"),
            condition=AlertCondition.ABOVE,
        )
        
        # Price below target - should not trigger
        assert alert.check_trigger(49000) is False
        assert alert.is_triggered is False
        
        # Price above target - should trigger
        assert alert.check_trigger(51000) is True
        assert alert.is_triggered is True
        assert alert.triggered_at is not None
        assert alert.triggered_price == 51000
    
    def test_check_trigger_below(self, bitcoin):
        """Test triggering an alert when price goes below target."""
        alert = PriceAlert.objects.create(
            cryptocurrency=bitcoin,
            target_price=Decimal("45000"),
            condition=AlertCondition.BELOW,
        )
        
        # Price above target - should not trigger
        assert alert.check_trigger(50000) is False
        
        # Price below target - should trigger
        assert alert.check_trigger(44000) is True
        assert alert.is_triggered is True
    
    def test_alert_does_not_retrigger(self, bitcoin):
        """Test that a triggered alert doesn't trigger again."""
        alert = PriceAlert.objects.create(
            cryptocurrency=bitcoin,
            target_price=Decimal("50000"),
            condition=AlertCondition.ABOVE,
        )
        
        # First trigger
        alert.check_trigger(51000)
        first_trigger_time = alert.triggered_at
        
        # Try to trigger again
        result = alert.check_trigger(52000)
        
        assert result is False
        assert alert.triggered_at == first_trigger_time


@pytest.mark.django_db
class TestAPIEndpoints:
    """Tests for API endpoints."""
    
    def test_list_cryptocurrencies(self, client, bitcoin, ethereum):
        """Test listing cryptocurrencies."""
        response = client.get("/api/cryptos/")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 2
    
    def test_get_cryptocurrency_detail(self, client, bitcoin, btc_price):
        """Test getting cryptocurrency detail."""
        response = client.get(f"/api/cryptos/{bitcoin.id}/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "BTC"
        assert data["latest_price"] is not None
    
    def test_create_alert(self, client, bitcoin):
        """Test creating a price alert."""
        response = client.post(
            "/api/alerts/",
            {
                "cryptocurrency": bitcoin.id,
                "target_price": "55000",
                "condition": "above",
            },
            content_type="application/json",
        )
        
        assert response.status_code == 201
        assert PriceAlert.objects.count() == 1
    
    def test_dashboard_stats(self, client, bitcoin, btc_price):
        """Test dashboard statistics endpoint."""
        response = client.get("/api/dashboard/")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_cryptos" in data
        assert "active_alerts" in data
    
    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/health/")
        
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
