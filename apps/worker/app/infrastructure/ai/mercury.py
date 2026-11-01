import json
import logging
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class AiUnavailable(RuntimeError):
    pass


class MercuryProvider:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        model: str,
        attempts: int = 2,
        circuit_threshold: int = 5,
        circuit_cooldown_seconds: float = 30.0,
    ) -> None:
        if not api_key:
            raise ValueError("INCEPTION_API_KEY is required for the Mercury provider")
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._attempts = attempts
        self._threshold = circuit_threshold
        self._cooldown = circuit_cooldown_seconds
        self._failures = 0
        self._open_until = 0.0

    def complete_json(
        self,
        *,
        system: str,
        user: str,
        schema: dict[str, Any],
        timeout_seconds: float = 12.0,
    ) -> dict[str, Any]:
        if time.monotonic() < self._open_until:
            raise AiUnavailable("circuit breaker is open")

        payload = {
            "model": self._model,
            "messages": [
                {"role": "developer", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.2,
            "max_tokens": 1500,
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": "result", "strict": True, "schema": schema},
            },
        }
        last_error: Exception | None = None
        for attempt in range(1, self._attempts + 1):
            try:
                response = httpx.post(
                    f"{self._base_url}/chat/completions",
                    headers={
                        "authorization": f"Bearer {self._api_key}",
                        "content-type": "application/json",
                    },
                    json=payload,
                    timeout=timeout_seconds,
                )
                if response.status_code >= 500:
                    last_error = AiUnavailable(f"mercury returned {response.status_code}")
                    continue
                response.raise_for_status()
                self._failures = 0
                body = response.json()
                content = str(body["choices"][0]["message"].get("content") or "").strip()
                if content.startswith("```"):
                    content = content.strip("`")
                    if content.startswith("json"):
                        content = content[4:].strip()
                return json.loads(content)
            except (httpx.HTTPError, KeyError, json.JSONDecodeError) as error:
                last_error = error
                if attempt < self._attempts:
                    time.sleep(0.4 * attempt)

        self._failures += 1
        if self._failures >= self._threshold:
            self._open_until = time.monotonic() + self._cooldown
            self._failures = 0
            logger.warning("mercury circuit opened for %ss", self._cooldown)
        raise AiUnavailable(str(last_error))
