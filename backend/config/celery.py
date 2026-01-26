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
    "fetch-crypto-prices-every-5-minutes": {
        "task": "core.tasks.fetch_crypto_prices",
        "schedule": crontab(minute="*/5"),  # Every 5 minutes
        "options": {"queue": "default"},
    },
    "check-price-alerts-every-minute": {
        "task": "core.tasks.check_price_alerts",
        "schedule": crontab(minute="*"),  # Every minute
        "options": {"queue": "default"},
    },
    "cleanup-old-price-history-daily": {
        "task": "core.tasks.cleanup_old_price_history",
        "schedule": crontab(hour=3, minute=0),  # Daily at 3 AM
        "options": {"queue": "default"},
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
