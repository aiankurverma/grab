import hmac
from typing import Annotated

from fastapi import Header, HTTPException, status

from app.config import get_settings


async def require_internal_token(
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    expected = get_settings().internal_api_secret
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing internal token",
        )
    provided = authorization.removeprefix("Bearer ").strip()
    if not hmac.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid internal token",
        )
