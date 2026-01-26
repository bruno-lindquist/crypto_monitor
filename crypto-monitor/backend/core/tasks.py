"""
Celery tasks for the Crypto Monitor application.

Contains tasks for fetching cryptocurrency prices from external APIs,
checking price alerts, and performing maintenance operations.
"""

import logging
import time
from datetime import timedelta
from decimal import Decimal
from typing import Optional

import requests
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from django.db import transaction

from .models import (
    Cryptocurrency,
    PriceHistory,
    PriceAlert,
    CollectionLog,
)

logger = logging.getLogger(__name__)

# CoinGecko API configuration
COINGECKO_API_URL = getattr(
    settings, "COINGECKO_API_URL", "https://api.coingecko.com/api/v3"
)
REQUEST_TIMEOUT = 30


class CoinGeckoClient:
    """
    Client for interacting with the CoinGecko API.
    
    Handles API requests, rate limiting, and error handling.
    """
    
    def __init__(self):
        self.base_url = COINGECKO_API_URL
        self.session = requests.Session()
        self.session.headers.update({
            "Accept": "application/json",
            "User-Agent": "CryptoMonitor/1.0",
        })
    
    def get_prices(self, ids: list[str], vs_currencies: str = "usd,brl") -> dict:
        """
        Fetch current prices for multiple cryptocurrencies.
        
        Args:
            ids: List of CoinGecko IDs
            vs_currencies: Comma-separated list of currencies
            
        Returns:
            Dict with price data for each cryptocurrency
        """
        url = f"{self.base_url}/simple/price"
        params = {
            "ids": ",".join(ids),
            "vs_currencies": vs_currencies,
            "include_24hr_vol": "true",
            "include_24hr_change": "true",
            "include_market_cap": "true",
        }
        
        response = self.session.get(url, params=params, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return response.json()
    
    def get_market_data(
        self,
        ids: list[str],
        vs_currency: str = "usd",
        per_page: int = 100,
    ) -> list[dict]:
        """
        Fetch detailed market data for cryptocurrencies.
        
        Args:
            ids: List of CoinGecko IDs
            vs_currency: Base currency for prices
            per_page: Number of results per page
            
        Returns:
            List of market data dicts
        """
        url = f"{self.base_url}/coins/markets"
        params = {
            "vs_currency": vs_currency,
            "ids": ",".join(ids),
            "order": "market_cap_desc",
            "per_page": per_page,
            "page": 1,
            "sparkline": "false",
            "price_change_percentage": "1h,24h,7d",
        }
        
        response = self.session.get(url, params=params, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return response.json()
    
    def get_coin_list(self) -> list[dict]:
        """
        Fetch list of all available coins.
        
        Returns:
            List of coin dicts with id, symbol, name
        """
        url = f"{self.base_url}/coins/list"
        response = self.session.get(url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return response.json()


@shared_task(
    bind=True,
    autoretry_for=(requests.RequestException,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_kwargs={"max_retries": 3},
)
def fetch_crypto_prices(self):
    """
    Fetch prices for all active cryptocurrencies.
    
    This task is scheduled to run every 5 minutes via Celery Beat.
    It fetches prices from CoinGecko and stores them in the database.
    """
    start_time = time.time()
    log = CollectionLog.objects.create()
    
    try:
        # Get all active cryptocurrencies
        cryptos = Cryptocurrency.objects.filter(is_active=True)
        
        if not cryptos.exists():
            logger.warning("No active cryptocurrencies to fetch")
            log.status = CollectionLog.Status.SUCCESS
            log.completed_at = timezone.now()
            log.save()
            return "No active cryptocurrencies"
        
        # Group by CoinGecko IDs
        crypto_map = {c.coingecko_id: c for c in cryptos}
        ids = list(crypto_map.keys())
        
        logger.info(f"Fetching prices for {len(ids)} cryptocurrencies")
        
        # Fetch data from CoinGecko
        client = CoinGeckoClient()
        
        # First, try to get detailed market data
        try:
            market_data = client.get_market_data(ids)
            prices_created = _process_market_data(market_data, crypto_map)
        except requests.RequestException as e:
            # Fallback to simple price endpoint
            logger.warning(f"Market data failed, using simple prices: {e}")
            simple_prices = client.get_prices(ids)
            prices_created = _process_simple_prices(simple_prices, crypto_map)
        
        # Update log
        execution_time = int((time.time() - start_time) * 1000)
        log.status = CollectionLog.Status.SUCCESS
        log.cryptos_processed = prices_created
        log.completed_at = timezone.now()
        log.execution_time_ms = execution_time
        log.save()
        
        logger.info(
            f"Successfully fetched {prices_created} prices in {execution_time}ms"
        )
        
        return f"Fetched {prices_created} prices"
        
    except Exception as e:
        logger.exception(f"Error fetching crypto prices: {e}")
        log.status = CollectionLog.Status.FAILED
        log.error_message = str(e)
        log.completed_at = timezone.now()
        log.execution_time_ms = int((time.time() - start_time) * 1000)
        log.save()
        raise


def _process_market_data(market_data: list[dict], crypto_map: dict) -> int:
    """
    Process market data response and create PriceHistory records.
    
    Args:
        market_data: List of market data from CoinGecko
        crypto_map: Dict mapping CoinGecko IDs to Cryptocurrency objects
        
    Returns:
        Number of price records created
    """
    prices_to_create = []
    now = timezone.now()
    
    for coin in market_data:
        coingecko_id = coin.get("id")
        crypto = crypto_map.get(coingecko_id)
        
        if not crypto:
            continue
        
        # Update image URL if available
        if coin.get("image") and not crypto.image_url:
            crypto.image_url = coin["image"]
            crypto.save(update_fields=["image_url"])
        
        # Create price history record
        prices_to_create.append(PriceHistory(
            cryptocurrency=crypto,
            price_usd=Decimal(str(coin.get("current_price", 0))),
            price_brl=Decimal(str(coin.get("current_price", 0) * 5.0)),  # Approximate BRL
            market_cap_usd=_safe_decimal(coin.get("market_cap")),
            volume_24h_usd=_safe_decimal(coin.get("total_volume")),
            change_1h=_safe_decimal(coin.get("price_change_percentage_1h_in_currency")),
            change_24h=_safe_decimal(coin.get("price_change_percentage_24h")),
            change_7d=_safe_decimal(coin.get("price_change_percentage_7d_in_currency")),
            collected_at=now,
        ))
    
    # Bulk create for efficiency
    if prices_to_create:
        PriceHistory.objects.bulk_create(prices_to_create)
    
    return len(prices_to_create)


def _process_simple_prices(prices_data: dict, crypto_map: dict) -> int:
    """
    Process simple price response and create PriceHistory records.
    
    Args:
        prices_data: Dict of prices from CoinGecko simple/price endpoint
        crypto_map: Dict mapping CoinGecko IDs to Cryptocurrency objects
        
    Returns:
        Number of price records created
    """
    prices_to_create = []
    now = timezone.now()
    
    for coingecko_id, data in prices_data.items():
        crypto = crypto_map.get(coingecko_id)
        
        if not crypto:
            continue
        
        prices_to_create.append(PriceHistory(
            cryptocurrency=crypto,
            price_usd=Decimal(str(data.get("usd", 0))),
            price_brl=Decimal(str(data.get("brl", 0))),
            volume_24h_usd=_safe_decimal(data.get("usd_24h_vol")),
            change_24h=_safe_decimal(data.get("usd_24h_change")),
            market_cap_usd=_safe_decimal(data.get("usd_market_cap")),
            collected_at=now,
        ))
    
    if prices_to_create:
        PriceHistory.objects.bulk_create(prices_to_create)
    
    return len(prices_to_create)


def _safe_decimal(value) -> Optional[Decimal]:
    """Convert value to Decimal safely, returning None if invalid."""
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except (ValueError, TypeError):
        return None


@shared_task(bind=True)
def fetch_single_crypto(self, crypto_id: int):
    """
    Fetch price for a single cryptocurrency.
    
    Args:
        crypto_id: ID of the Cryptocurrency to fetch
    """
    try:
        crypto = Cryptocurrency.objects.get(id=crypto_id)
    except Cryptocurrency.DoesNotExist:
        logger.error(f"Cryptocurrency {crypto_id} not found")
        return
    
    client = CoinGeckoClient()
    
    try:
        data = client.get_prices([crypto.coingecko_id])
        coin_data = data.get(crypto.coingecko_id, {})
        
        if coin_data:
            PriceHistory.objects.create(
                cryptocurrency=crypto,
                price_usd=Decimal(str(coin_data.get("usd", 0))),
                price_brl=Decimal(str(coin_data.get("brl", 0))),
                volume_24h_usd=_safe_decimal(coin_data.get("usd_24h_vol")),
                change_24h=_safe_decimal(coin_data.get("usd_24h_change")),
                market_cap_usd=_safe_decimal(coin_data.get("usd_market_cap")),
            )
            logger.info(f"Fetched price for {crypto.symbol}")
            return f"Updated {crypto.symbol}"
        
    except requests.RequestException as e:
        logger.error(f"Error fetching {crypto.symbol}: {e}")
        raise


@shared_task(bind=True)
def check_price_alerts(self):
    """
    Check all active alerts against current prices.
    
    This task is scheduled to run every minute via Celery Beat.
    """
    alerts = PriceAlert.objects.filter(
        is_active=True,
        is_triggered=False,
    ).select_related("cryptocurrency")
    
    triggered_count = 0
    
    for alert in alerts:
        latest_price = alert.cryptocurrency.latest_price
        
        if not latest_price:
            continue
        
        current_price = float(latest_price.price_usd)
        
        if alert.check_trigger(current_price):
            triggered_count += 1
            logger.info(
                f"Alert triggered: {alert.cryptocurrency.symbol} "
                f"{alert.condition} ${alert.target_price} "
                f"(current: ${current_price})"
            )
            
            # Here you could add notification logic
            # send_alert_notification.delay(alert.id)
    
    if triggered_count > 0:
        logger.info(f"Triggered {triggered_count} alerts")
    
    return f"Checked alerts, {triggered_count} triggered"


@shared_task(bind=True)
def cleanup_old_price_history(self, days_to_keep: int = 30):
    """
    Remove price history older than specified days.
    
    This task is scheduled to run daily at 3 AM via Celery Beat.
    
    Args:
        days_to_keep: Number of days of history to keep (default: 30)
    """
    cutoff_date = timezone.now() - timedelta(days=days_to_keep)
    
    with transaction.atomic():
        deleted_count, _ = PriceHistory.objects.filter(
            collected_at__lt=cutoff_date
        ).delete()
    
    logger.info(f"Cleaned up {deleted_count} old price history records")
    return f"Deleted {deleted_count} records"


@shared_task(bind=True)
def sync_coin_list(self):
    """
    Sync available coins from CoinGecko.
    
    This can be used to discover new coins or update existing ones.
    """
    client = CoinGeckoClient()
    
    try:
        coins = client.get_coin_list()
        logger.info(f"Found {len(coins)} coins on CoinGecko")
        return f"Found {len(coins)} coins"
    except requests.RequestException as e:
        logger.error(f"Error syncing coin list: {e}")
        raise
