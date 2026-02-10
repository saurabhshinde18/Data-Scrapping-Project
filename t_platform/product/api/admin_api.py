import os
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from t_platform.product.api.auth_api import ADMIN_EMAIL, get_db_pool, require_admin, _hash_password
from t_platform.product.services.plan_service import (
    ensure_default_plans,
    list_plans as list_db_plans,
    update_plan,
)
from t_platform.product.services.analytics_service import get_visit_series
from t_platform.product.services.user_service import (
    admin_metrics,
    create_user,
    delete_user,
    get_user_by_email,
    get_user_by_id,
    get_user_registration_series,
    list_admin_invites,
    list_users_with_subscription,
)


admin_router = APIRouter()

DEFAULT_PLAN_CONFIG = {
    "Starter": {
        "amount": 1999,
        "currency": "INR",
        "duration_days": 30,
        "razorpay_plan_id": os.getenv("RAZORPAY_PLAN_STARTER", ""),
        "description": "For small teams validating markets.",
        "features": ["100 searches / month", "Basic alerts", "Email support"],
    },
    "Growth": {
        "amount": 7999,
        "currency": "INR",
        "duration_days": 30,
        "razorpay_plan_id": os.getenv("RAZORPAY_PLAN_GROWTH", ""),
        "description": "Scale monitoring and reporting.",
        "features": ["1,000 searches / month", "Advanced alerts", "Team roles"],
    },
    "Enterprise": {
        "amount": 0,
        "currency": "INR",
        "duration_days": 30,
        "razorpay_plan_id": os.getenv("RAZORPAY_PLAN_ENTERPRISE", ""),
        "description": "Custom volumes and SLAs.",
        "features": ["Unlimited searches", "Dedicated support", "Custom integrations"],
    },
}

class InviteRequest(BaseModel):
    email: str
    full_name: str | None = None
    username: str | None = None
    phone_code: str | None = None
    phone_number: str | None = None


class UpdatePlanRequest(BaseModel):
    amount: float | None = None
    currency: str | None = None
    duration_days: int | None = None
    razorpay_plan_id: str | None = None
    description: str | None = None
    features: list[str] | None = None


@admin_router.get("/metrics")
async def metrics(_: dict = Depends(require_admin), pool=Depends(get_db_pool)):
    return await admin_metrics(pool)


@admin_router.get("/users")
async def users(_: dict = Depends(require_admin), pool=Depends(get_db_pool)):
    return await list_users_with_subscription(pool)


@admin_router.get("/invites")
async def invites(_: dict = Depends(require_admin), pool=Depends(get_db_pool)):
    return await list_admin_invites(pool)


@admin_router.delete("/invites/{admin_id}")
async def delete_invite(
    admin_id: int, _: dict = Depends(require_admin), pool=Depends(get_db_pool)
):
    user = await get_user_by_id(pool, admin_id)
    if not user:
        raise HTTPException(status_code=404, detail="Admin not found.")
    if user.get("email", "").lower() == ADMIN_EMAIL.lower():
        raise HTTPException(status_code=400, detail="Cannot delete primary admin.")
    if user.get("role") != "admin" or not user.get("admin_invited"):
        raise HTTPException(status_code=400, detail="Only invited admins can be deleted.")
    await delete_user(pool, admin_id)
    return {"ok": True}


@admin_router.post("/invite")
async def invite(
    req: InviteRequest, payload: dict = Depends(require_admin), pool=Depends(get_db_pool)
):
    email = req.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    if email == ADMIN_EMAIL.lower():
        raise HTTPException(status_code=400, detail="Email already exists.")

    existing = await get_user_by_email(pool, email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists.")

    temp_password = secrets.token_urlsafe(10)
    user = await create_user(
        pool,
        email=email,
        password_hash=_hash_password(temp_password),
        role="admin",
        full_name=req.full_name,
        username=req.username,
        phone_code=req.phone_code,
        phone_number=req.phone_number,
        admin_invited=True,
        invited_at=datetime.utcnow(),
        invited_by=payload.get("sub"),
    )
    return {
        "email": email,
        "id": user["id"],
        "temp_password": temp_password,
    }


@admin_router.get("/plans")
async def admin_plans(_: dict = Depends(require_admin), pool=Depends(get_db_pool)):
    await ensure_default_plans(pool, DEFAULT_PLAN_CONFIG)
    return await list_db_plans(pool)


@admin_router.get("/visitors")
async def visitors(
    range_days: int = 90, _: dict = Depends(require_admin), pool=Depends(get_db_pool)
):
    safe_days = min(max(range_days, 1), 365)
    return await get_visit_series(pool, safe_days)


@admin_router.get("/registrations")
async def registrations(
    range_days: int = 90, _: dict = Depends(require_admin), pool=Depends(get_db_pool)
):
    safe_days = min(max(range_days, 1), 365)
    return await get_user_registration_series(pool, safe_days)


@admin_router.put("/plans/{plan_name}")
async def update_plan_pricing(
    plan_name: str,
    req: UpdatePlanRequest,
    _: dict = Depends(require_admin),
    pool=Depends(get_db_pool),
):
    await ensure_default_plans(pool, DEFAULT_PLAN_CONFIG)
    updated = await update_plan(
        pool,
        name=plan_name,
        amount=req.amount,
        currency=req.currency,
        duration_days=req.duration_days,
        razorpay_plan_id=req.razorpay_plan_id,
        description=req.description,
        features=req.features,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Plan not found.")
    return updated
