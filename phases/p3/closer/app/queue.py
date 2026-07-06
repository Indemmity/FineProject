"""Queue-based email delivery — retry with backoff and circuit breaker.

In production, this would use Redis (Bull/Celery). Current implementation
provides an in-memory queue for development.
"""

import time
import logging
from dataclasses import dataclass, field
from typing import Any
from threading import Lock

logger = logging.getLogger(__name__)


@dataclass
class QueuedEmail:
    id: str
    to_email: str
    to_name: str
    subject: str
    body_html: str
    body_text: str
    attempts: int = 0
    max_attempts: int = 3
    last_error: str | None = None
    created_at: float = field(default_factory=time.time)


class EmailQueue:
    """In-memory email queue with retry and circuit breaker."""

    def __init__(self, max_retries: int = 3, circuit_breaker_threshold: int = 3):
        self._queue: list[QueuedEmail] = []
        self._lock = Lock()
        self.max_retries = max_retries
        self.circuit_breaker_threshold = circuit_breaker_threshold
        self._consecutive_failures = 0
        self._circuit_open = False
        self._circuit_opened_at: float = 0

    def enqueue(self, email: QueuedEmail) -> None:
        """Add an email to the queue."""
        with self._lock:
            self._queue.append(email)
            logger.info("Email queued", extra={"id": email.id, "to": email.to_email})

    def dequeue(self) -> QueuedEmail | None:
        """Get the next email to send."""
        with self._lock:
            if not self._queue:
                return None
            return self._queue.pop(0)

    def retry(self, email: QueuedEmail) -> None:
        """Re-queue an email for retry with backoff."""
        email.attempts += 1
        if email.attempts >= self.max_retries:
            logger.warning("Email reached max retries", extra={"id": email.id})
            self._consecutive_failures += 1
            self._check_circuit_breaker()
            return

        backoff = 30 * (2 ** (email.attempts - 1))  # 30s, 60s, 120s
        email.created_at = time.time() + backoff
        with self._lock:
            self._queue.append(email)
            logger.info(
                "Email queued for retry",
                extra={"id": email.id, "attempt": email.attempts, "backoff": backoff},
            )

    def _check_circuit_breaker(self) -> None:
        """Open circuit breaker if too many consecutive failures."""
        if self._consecutive_failures >= self.circuit_breaker_threshold:
            self._circuit_open = True
            self._circuit_opened_at = time.time()
            logger.warning(
                "Circuit breaker opened — pausing delivery for 5 minutes"
            )

    @property
    def is_circuit_open(self) -> bool:
        if not self._circuit_open:
            return False
        # Auto-reset after 5 minutes
        if time.time() - self._circuit_opened_at > 300:
            self._circuit_open = False
            self._consecutive_failures = 0
            logger.info("Circuit breaker reset after cooldown")
            return False
        return True

    def size(self) -> int:
        with self._lock:
            return len(self._queue)

    def clear(self) -> None:
        with self._lock:
            self._queue.clear()
            self._consecutive_failures = 0
            self._circuit_open = False


# Global queue instance
email_queue = EmailQueue()