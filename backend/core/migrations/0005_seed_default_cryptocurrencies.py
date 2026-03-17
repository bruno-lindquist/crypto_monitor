import os
import sys

from django.db import migrations


DEFAULT_CRYPTOS = [
    {"symbol": "BTC", "name": "Bitcoin", "coingecko_id": "bitcoin"},
    {"symbol": "ETH", "name": "Ethereum", "coingecko_id": "ethereum"},
    {"symbol": "USDT", "name": "Tether", "coingecko_id": "tether"},
    {"symbol": "BNB", "name": "BNB", "coingecko_id": "binancecoin"},
    {"symbol": "SOL", "name": "Solana", "coingecko_id": "solana"},
    {"symbol": "XRP", "name": "XRP", "coingecko_id": "ripple"},
    {"symbol": "USDC", "name": "USD Coin", "coingecko_id": "usd-coin"},
    {"symbol": "ADA", "name": "Cardano", "coingecko_id": "cardano"},
    {"symbol": "DOGE", "name": "Dogecoin", "coingecko_id": "dogecoin"},
    {"symbol": "AVAX", "name": "Avalanche", "coingecko_id": "avalanche-2"},
    {"symbol": "TRX", "name": "TRON", "coingecko_id": "tron"},
    {"symbol": "DOT", "name": "Polkadot", "coingecko_id": "polkadot"},
    {"symbol": "LINK", "name": "Chainlink", "coingecko_id": "chainlink"},
    {"symbol": "MATIC", "name": "Polygon", "coingecko_id": "matic-network"},
    {"symbol": "SHIB", "name": "Shiba Inu", "coingecko_id": "shiba-inu"},
    {"symbol": "LTC", "name": "Litecoin", "coingecko_id": "litecoin"},
    {"symbol": "BCH", "name": "Bitcoin Cash", "coingecko_id": "bitcoin-cash"},
    {"symbol": "UNI", "name": "Uniswap", "coingecko_id": "uniswap"},
    {"symbol": "ATOM", "name": "Cosmos", "coingecko_id": "cosmos"},
    {"symbol": "XLM", "name": "Stellar", "coingecko_id": "stellar"},
]


def seed_default_cryptocurrencies(apps, schema_editor):
    db_name = schema_editor.connection.settings_dict.get("NAME") or ""
    if db_name.startswith("test_"):
        return

    if os.environ.get("PYTEST_CURRENT_TEST"):
        return

    if any("pytest" in arg for arg in sys.argv):
        return

    Cryptocurrency = apps.get_model("core", "Cryptocurrency")

    for crypto in DEFAULT_CRYPTOS:
        Cryptocurrency.objects.update_or_create(
            symbol=crypto["symbol"],
            defaults={
                "name": crypto["name"],
                "coingecko_id": crypto["coingecko_id"],
                "is_active": True,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_remove_collectionlog_cryptos_failed_and_more"),
    ]

    operations = [
        migrations.RunPython(
            seed_default_cryptocurrencies,
            migrations.RunPython.noop,
        ),
    ]
