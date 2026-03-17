"""
Celery configuration for Crypto Monitor project.
"""

import os

from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("crypto_monitor")

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat Schedule - Periodic Tasks
app.conf.beat_schedule = {
    "fetch-crypto-prices-every-minute": {
        "task": "core.tasks.fetch_crypto_prices",
        "schedule": 60.0,  # Every 60 seconds
    },
    "check-price-alerts-every-minute": {
        "task": "core.tasks.check_price_alerts",
        "schedule": 60.0,  # Every 60 seconds
    },
    "cleanup-old-price-history-daily": {
        "task": "core.tasks.cleanup_old_price_history",
        "schedule": crontab(hour=3, minute=0),  # Daily at 3 AM
    },
}
