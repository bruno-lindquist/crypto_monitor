"""
Tests for the Crypto Monitor application.
"""

import pytest
from decimal import Decimal
from django.utils import timezone
from django.test import Client
from datetime import timedelta

from core.access import hash_alert_client_token
from core.models import (
    Cryptocurrency,
    PriceHistory,
    PriceAlert,
    AlertCondition,
)
from core.tasks import _process_market_data, check_price_alerts


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


@pytest.fixture
def alert_client_token():
    return "alert-client-token-for-tests-123456"


@pytest.fixture
def admin_client(django_user_model):
    admin_user = django_user_model.objects.create_user(
        username="admin",
        password="admin-pass-123",
        is_staff=True,
        is_superuser=True,
    )
    admin_client = Client()
    admin_client.force_login(admin_user)
    return admin_client


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

    def test_process_market_data_uses_real_brl(self, bitcoin):
        """Market data processing should persist BRL returned by the API."""
        created = _process_market_data(
            [
                {
                    "id": "bitcoin",
                    "current_price": 50000,
                    "market_cap": 900000000,
                    "total_volume": 12000000,
                    "price_change_percentage_1h_in_currency": 1.5,
                    "price_change_percentage_24h": 2.5,
                    "price_change_percentage_7d_in_currency": 5.5,
                }
            ],
            {"bitcoin": bitcoin},
            {"bitcoin": {"brl": 287654.32}},
        )

        assert created == 1
        latest_price = PriceHistory.objects.get()
        assert latest_price.price_brl == Decimal("287654.32")
        assert latest_price.is_brl_estimated is False


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

    def test_list_cryptocurrencies_avoids_n_plus_one_queries(
        self,
        client,
        bitcoin,
        ethereum,
        btc_price,
        django_assert_num_queries,
    ):
        """Listing cryptocurrencies should stay on a bounded query count."""
        PriceHistory.objects.create(
            cryptocurrency=ethereum,
            price_usd=Decimal("3000.00"),
            price_brl=Decimal("15000.00"),
            change_24h=Decimal("1.2"),
            volume_24h_usd=Decimal("500000000"),
        )

        with django_assert_num_queries(2):
            response = client.get("/api/cryptos/")

        assert response.status_code == 200
        assert len(response.json()["results"]) == 2
    
    def test_create_alert(self, client, bitcoin, alert_client_token):
        """Test creating a price alert."""
        response = client.post(
            "/api/alerts/",
            {
                "cryptocurrency": bitcoin.id,
                "target_price": "55000",
                "condition": "above",
            },
            content_type="application/json",
            HTTP_X_ALERT_CLIENT_TOKEN=alert_client_token,
        )
        
        assert response.status_code == 201
        assert PriceAlert.objects.count() == 1

    def test_price_history_limit_keeps_ordering(self, client, bitcoin):
        """Applying limit should still return the newest price first."""
        older = PriceHistory.objects.create(
            cryptocurrency=bitcoin,
            price_usd=Decimal("49000"),
            price_brl=Decimal("245000"),
            collected_at=timezone.now() - timedelta(hours=1),
        )
        newer = PriceHistory.objects.create(
            cryptocurrency=bitcoin,
            price_usd=Decimal("50000"),
            price_brl=Decimal("250000"),
        )

        response = client.get("/api/prices/?limit=1")

        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 1
        assert data["results"][0]["id"] == newer.id
        assert data["results"][0]["id"] != older.id

    def test_crypto_history_invalid_hours_returns_400(self, client, bitcoin):
        """Invalid hours on the crypto history endpoint should return 400."""
        response = client.get(f"/api/cryptos/{bitcoin.id}/history/?hours=abc")

        assert response.status_code == 400
        assert "hours" in response.json()

    def test_price_history_invalid_limit_returns_400(self, client):
        """Invalid limit on the price history endpoint should return 400."""
        response = client.get("/api/prices/?limit=abc")

        assert response.status_code == 400
        assert "limit" in response.json()

    def test_alert_list_invalid_boolean_returns_400(self, client, alert_client_token):
        """Invalid boolean filters on alerts should return 400."""
        response = client.get(
            "/api/alerts/?active=talvez",
            HTTP_X_ALERT_CLIENT_TOKEN=alert_client_token,
        )

        assert response.status_code == 400
        assert "active" in response.json()

    def test_create_alert_requires_client_token(self, client, bitcoin):
        """Alert creation should require an anonymous client token."""
        response = client.post(
            "/api/alerts/",
            {
                "cryptocurrency": bitcoin.id,
                "target_price": "55000",
                "condition": "above",
            },
            content_type="application/json",
        )

        assert response.status_code == 403

    def test_alert_list_is_scoped_to_client_token(self, client, bitcoin, alert_client_token):
        """Anonymous clients should only see alerts created with the same token."""
        PriceAlert.objects.create(
            cryptocurrency=bitcoin,
            target_price=Decimal("55000"),
            condition=AlertCondition.ABOVE,
            owner_token_hash=hash_alert_client_token(alert_client_token),
        )
        PriceAlert.objects.create(
            cryptocurrency=bitcoin,
            target_price=Decimal("45000"),
            condition=AlertCondition.BELOW,
            owner_token_hash=hash_alert_client_token("other-client-token-123456"),
        )

        response = client.get(
            "/api/alerts/",
            HTTP_X_ALERT_CLIENT_TOKEN=alert_client_token,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1
        assert data["results"][0]["target_price"] == "55000.00000000"

    def test_manual_fetch_requires_admin(self, client, admin_client, monkeypatch):
        """Manual fetch should be restricted to staff users."""

        class DummyTaskResult:
            id = "task-123"

        monkeypatch.setattr("core.views.fetch_crypto_prices.delay", lambda: DummyTaskResult())

        response = client.post("/api/fetch/")
        assert response.status_code == 403

        response = admin_client.post("/api/fetch/")
        assert response.status_code == 202
        assert response.json()["task_id"] == "task-123"

    def test_crypto_refresh_requires_admin(self, client, admin_client, bitcoin, monkeypatch):
        """Single-crypto refresh should be restricted to staff users."""

        class DummyTaskResult:
            id = "task-456"

        monkeypatch.setattr("core.views.fetch_single_crypto.delay", lambda crypto_id: DummyTaskResult())

        response = client.post(f"/api/cryptos/{bitcoin.id}/refresh/")
        assert response.status_code == 403

        response = admin_client.post(f"/api/cryptos/{bitcoin.id}/refresh/")
        assert response.status_code == 200
        assert response.json()["task_id"] == "task-456"
    
    def test_dashboard_stats(self, client, bitcoin, btc_price):
        """Test dashboard statistics endpoint."""
        response = client.get("/api/dashboard/")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_cryptos" in data
        assert "active_alerts" in data

    def test_check_price_alerts_avoids_n_plus_one_queries(
        self,
        bitcoin,
        ethereum,
        django_assert_num_queries,
    ):
        """Alert checking should load latest prices without per-alert queries."""
        PriceHistory.objects.create(
            cryptocurrency=bitcoin,
            price_usd=Decimal("50000.00"),
            price_brl=Decimal("250000.00"),
        )
        PriceHistory.objects.create(
            cryptocurrency=ethereum,
            price_usd=Decimal("3000.00"),
            price_brl=Decimal("15000.00"),
        )
        PriceAlert.objects.create(
            cryptocurrency=bitcoin,
            target_price=Decimal("60000.00"),
            condition=AlertCondition.ABOVE,
            owner_token_hash="owner-a",
        )
        PriceAlert.objects.create(
            cryptocurrency=ethereum,
            target_price=Decimal("3500.00"),
            condition=AlertCondition.ABOVE,
            owner_token_hash="owner-b",
        )

        with django_assert_num_queries(1):
            result = check_price_alerts.run()

        assert result == "Checked alerts, 0 triggered"
    
    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/health/")
        
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
