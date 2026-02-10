from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from t_platform.product.api.auth_api import get_db_pool
from t_platform.product.services.analytics_service import record_visit

analytics_router = APIRouter()


class VisitRequest(BaseModel):
    path: str | None = None
    visitor_id: str | None = None


@analytics_router.post("/visit")
async def visit(req: VisitRequest, request: Request, pool=Depends(get_db_pool)):
    path = req.path or request.headers.get("referer") or "/"
    visitor_id = req.visitor_id
    user_agent = request.headers.get("user-agent")
    await record_visit(pool, path, visitor_id, user_agent)
    return {"ok": True}
