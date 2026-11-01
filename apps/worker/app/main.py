import ipaddress
import logging

from fastapi import FastAPI, Request, Response, status

from app.api.routes import router
from app.config import get_settings

logging.basicConfig(
    level=getattr(logging, get_settings().log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(
    title="GrabWave Worker",
    version="0.1.0",
    docs_url="/internal/docs" if get_settings().app_env != "production" else None,
    openapi_url="/internal/openapi.json" if get_settings().app_env != "production" else None,
)


@app.middleware("http")
async def loopback_and_internal_shield(request: Request, call_next):
    client_host = request.client.host if request.client else None
    if client_host:
        try:
            ip = ipaddress.ip_address(client_host)
            # Worker must only accept loopback (127.0.0.1, ::1) or internal private RFC1918 traffic
            if not (ip.is_loopback or ip.is_private):
                return Response(
                    content="External requests rejected. Worker runs on loopback/internal network only.",
                    status_code=status.HTTP_403_FORBIDDEN,
                )
        except ValueError:
            return Response(
                content="Invalid client address.",
                status_code=status.HTTP_403_FORBIDDEN,
            )
    return await call_next(request)


app.include_router(router)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "grabwave-worker", "status": "ok"}
