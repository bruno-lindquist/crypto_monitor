"""
Access control helpers for API endpoints.
"""

from __future__ import annotations

import hashlib
from typing import Optional

from django.conf import settings
from rest_framework.permissions import BasePermission


def get_alert_client_token(request) -> Optional[str]:
    """Return the anonymous alert-management token sent by the client."""
    header_name = getattr(settings, "ALERT_CLIENT_TOKEN_HEADER", "HTTP_X_ALERT_CLIENT_TOKEN")
    token = request.META.get(header_name, "").strip()
    if len(token) < 20:
        return None
    return token


def hash_alert_client_token(token: str) -> str:
    """Hash the client token before storing it in the database."""
    secret = getattr(settings, "SECRET_KEY", "").encode("utf-8")
    return hashlib.sha256(secret + token.encode("utf-8")).hexdigest()


def get_alert_token_hash_for_request(request) -> Optional[str]:
    token = get_alert_client_token(request)
    if token is None:
        return None
    return hash_alert_client_token(token)


def filter_alerts_for_request(queryset, request):
    """
    Scope alerts to the current admin user or anonymous client token.

    Anonymous clients can only access alerts created with the same
    token, which keeps alert management private without introducing
    a full user account flow.
    """
    if request.user and request.user.is_staff:
        return queryset

    token_hash = get_alert_token_hash_for_request(request)
    if token_hash is None:
        return queryset.none()

    return queryset.filter(owner_token_hash=token_hash)


class HasAlertClientTokenOrAdmin(BasePermission):
    """Require either staff access or a valid alert client token."""

    message = "A valid alert client token is required."

    def has_permission(self, request, view):
        if request.user and request.user.is_staff:
            return True
        return get_alert_client_token(request) is not None
