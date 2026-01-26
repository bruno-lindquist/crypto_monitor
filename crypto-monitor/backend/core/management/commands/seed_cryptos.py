"""
Management command to seed initial cryptocurrency data.
"""

from django.core.management.base import BaseCommand
from core.models import Cryptocurrency


# Top 20 cryptocurrencies by market cap
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


class Command(BaseCommand):
    help = "Seed the database with initial cryptocurrency data"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing cryptocurrencies before seeding",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing cryptocurrencies...")
            Cryptocurrency.objects.all().delete()

        created_count = 0
        updated_count = 0

        for crypto_data in DEFAULT_CRYPTOS:
            crypto, created = Cryptocurrency.objects.update_or_create(
                symbol=crypto_data["symbol"],
                defaults={
                    "name": crypto_data["name"],
                    "coingecko_id": crypto_data["coingecko_id"],
                    "is_active": True,
                },
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"  Created: {crypto.symbol} - {crypto.name}")
                )
            else:
                updated_count += 1
                self.stdout.write(f"  Updated: {crypto.symbol} - {crypto.name}")

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done! Created {created_count}, updated {updated_count} cryptocurrencies."
            )
        )
