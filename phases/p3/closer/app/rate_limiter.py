"""Rate limiter — token bucket algorithm for email sending.

Supports:
- Per-user hourly and daily limits
- Retry-After header calculation
- Thread-safe counters
"""

import time
from collections import defaultdict
from threading import Lock


class RateLimiter:
    """Token bucket rate limiter per user."""

    def __init__(self, hourly_limit: int = 20, daily_limit: int = 100):
        self.hourly_limit = hourly_limit
        self.daily_limit = daily_limit
        self._hourly: dict[str, list[float]] = defaultdict(list)
        self._daily: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def check(self, user_id: str) -> tuple[bool, int]:
        """Check if a user can send an email.

        Returns:
            (allowed, retry_after_seconds)
        """
        now = time.time()
        with self._lock:
            # Prune old entries
            hour_ago = now - 3600
            day_ago = now - 86400
            self._hourly[user_id] = [t for t in self._hourly[user_id] if t > hour_ago]
            self._daily[user_id] = [t for t in self._daily[user_id] if t > day_ago]

            # Check limits
            if len(self._hourly[user_id]) >= self.hourly_limit:
                oldest = self._hourly[user_id][0]
                retry_after = int(oldest + 3600 - now)
                return False, max(retry_after, 1)

            if len(self._daily[user_id]) >= self.daily_limit:
                oldest = self._daily[user_id][0]
                retry_after = int(oldest + 86400 - now)
                return False, max(retry_after, 1)

            # Allow
            self._hourly[user_id].append(now)
            self._daily[user_id].append(now)
            return True, 0

    def remaining(self, user_id: str) -> dict[str, int]:
        """Get remaining capacity for a user."""
        now = time.time()
        with self._lock:
            hour_ago = now - 3600
            day_ago = now - 86400
            hourly = len([t for t in self._hourly[user_id] if t > hour_ago])
            daily = len([t for t in self._daily[user_id] if t > day_ago])
        return {
            "hourly_remaining": max(0, self.hourly_limit - hourly),
            "daily_remaining": max(0, self.daily_limit - daily),
        }

    def reset(self, user_id: str) -> None:
        """Reset all counters for a user."""
        with self._lock:
            self._hourly[user_id] = []
            self._daily[user_id] = []


# Global rate limiter instance
rate_limiter = RateLimiter()