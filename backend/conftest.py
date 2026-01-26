"""
Pytest configuration for the Crypto Monitor backend tests.
"""

import pytest


@pytest.fixture(scope="session")
def django_db_setup():
    """Configure database for tests."""
    pass


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """Enable database access for all tests automatically."""
    pass
