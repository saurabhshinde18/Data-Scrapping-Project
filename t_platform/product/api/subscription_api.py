from datetime import datetime, timedelta
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import razorpay
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from t_platform.product.api.auth_api import get_current_user, get_db_pool
from t_platform.product.services.plan_service import (
    ensure_default_plans,
    get_plan_by_name,
    list_plans as list_db_plans,
    update_plan,
)
from t_platform.product.services.user_service import (
    activate_subscription,
    create_payment,
    create_subscription,
    get_active_subscription,
    get_latest_subscription,
    update_subscription_status,
)


subscription_router = APIRouter()

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_PLAN_CREATE = os.getenv("RAZORPAY_PLAN_CREATE", "true").lower() == "true"
RAZORPAY_PLAN_INTERVAL = os.getenv("RAZORPAY_PLAN_INTERVAL", "monthly")
RAZORPAY_PLAN_PERIOD = int(os.getenv("RAZORPAY_PLAN_PERIOD", "1"))

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


def _razorpay_client():
    settings = _get_razorpay_settings()
    if not (settings["key_id"] and settings["key_secret"]):
        raise HTTPException(status_code=400, detail="Razorpay keys missing.")
    return razorpay.Client(auth=(settings["key_id"], settings["key_secret"]))


def _cancel_razorpay_subscription(client: razorpay.Client, subscription_id: str) -> None:
    if not subscription_id:
        return
    # Cancel immediately.
    client.subscription.cancel(subscription_id, {"cancel_at_cycle_end": 0})


def _get_razorpay_settings() -> dict:
    return {
        "key_id": os.getenv("RAZORPAY_KEY_ID", RAZORPAY_KEY_ID or ""),
        "key_secret": os.getenv("RAZORPAY_KEY_SECRET", RAZORPAY_KEY_SECRET or ""),
        "plan_create": os.getenv("RAZORPAY_PLAN_CREATE", "true" if RAZORPAY_PLAN_CREATE else "false").lower() == "true",
        "plan_interval": os.getenv("RAZORPAY_PLAN_INTERVAL", RAZORPAY_PLAN_INTERVAL or "monthly"),
        "plan_period": int(os.getenv("RAZORPAY_PLAN_PERIOD", str(RAZORPAY_PLAN_PERIOD or 1))),
    }

def _to_razorpay_amount(amount: float, currency: str) -> int:
    if amount is None:
        return 0
    # Razorpay expects the smallest currency unit (paise for INR).
    # We store/display amounts in whole currency units.
    return int(round(float(amount) * 100))


async def _ensure_plan_id(pool, plan_name: str, plan: dict) -> dict:
    if plan.get("razorpay_plan_id"):
        return plan
    settings = _get_razorpay_settings()
    if not settings["plan_create"]:
        raise HTTPException(status_code=400, detail="Razorpay plan ID missing.")

    client = _razorpay_client()
    item_name = f"{plan_name} Plan"
    item = {
        "name": item_name,
        "amount": _to_razorpay_amount(plan["amount"], plan["currency"]),
        "currency": plan["currency"],
    }
    payload = {
        "period": settings["plan_interval"],
        "interval": settings["plan_period"],
        "item": item,
    }
    created = client.plan.create(payload)
    plan_id = created.get("id")
    if not plan_id:
        raise HTTPException(status_code=400, detail="Failed to create Razorpay plan.")
    await update_plan(
        pool,
        name=plan_name,
        razorpay_plan_id=plan_id,
    )
    plan["razorpay_plan_id"] = plan_id
    return plan


class CreateSubscriptionRequest(BaseModel):
    plan_name: str


class VerifySubscriptionRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str


@subscription_router.get("/plans")
async def list_plans(pool=Depends(get_db_pool)):
    await ensure_default_plans(pool, DEFAULT_PLAN_CONFIG)
    plans = await list_db_plans(pool)
    return [
        {
            "name": plan["name"],
            "amount": plan["amount"],
            "currency": plan["currency"],
            "duration_days": plan["duration_days"],
            "description": plan.get("description"),
            "features": plan.get("features") or [],
        }
        for plan in plans
    ]


@subscription_router.get("/status")
async def subscription_status(
    payload: dict = Depends(get_current_user),
    pool=Depends(get_db_pool),
):
    if payload.get("role") == "admin":
        return {"active": True, "plan_name": "admin"}
    user_id = payload.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user.")
    subscription = await get_active_subscription(pool, user_id)
    if not subscription:
        return {"active": False}
    start_date = subscription.get("start_date")
    end_date = subscription.get("end_date")
    remaining_days = None
    if end_date:
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)
        remaining_days = max((end_date - datetime.now(timezone.utc)).days, 0)
    return {
        "active": True,
        "plan_name": subscription.get("plan_name"),
        "start_date": start_date.isoformat() if start_date else None,
        "end_date": end_date.isoformat() if end_date else None,
        "remaining_days": remaining_days,
    }


@subscription_router.post("/create")
async def create_subscription_checkout(
    req: CreateSubscriptionRequest,
    payload: dict = Depends(get_current_user),
    pool=Depends(get_db_pool),
):
    settings = _get_razorpay_settings()
    if not (settings["key_id"] and settings["key_secret"]):
        raise HTTPException(status_code=400, detail="Razorpay keys missing.")
    if payload.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Admin does not need a subscription.")
    user_id = payload.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user.")

    await ensure_default_plans(pool, DEFAULT_PLAN_CONFIG)
    plan = await get_plan_by_name(pool, req.plan_name)
    if not plan:
        raise HTTPException(status_code=400, detail="Unknown plan.")
    plan = await _ensure_plan_id(pool, req.plan_name, plan)

    # Allow upgrades by creating a new subscription even if one is active.

    client = _razorpay_client()
    data = client.subscription.create(
        {
            "plan_id": plan.get("razorpay_plan_id"),
            "total_count": 12,
            "customer_notify": 1,
        }
    )
    subscription = await create_subscription(
        pool,
        user_id=user_id,
        plan_name=req.plan_name,
        amount=plan["amount"],
        currency=plan["currency"],
        razorpay_subscription_id=data.get("id"),
        razorpay_customer_id=data.get("customer_id"),
    )

    return {
        "razorpay_key_id": settings["key_id"],
        "subscription_id": subscription["id"],
        "razorpay_subscription_id": data.get("id"),
        "plan_name": req.plan_name,
        "amount": plan["amount"],
        "currency": plan["currency"],
    }


@subscription_router.post("/verify")
async def verify_subscription(
    req: VerifySubscriptionRequest,
    payload: dict = Depends(get_current_user),
    pool=Depends(get_db_pool),
):
    try:
        settings = _get_razorpay_settings()
        if not (settings["key_id"] and settings["key_secret"]):
            raise HTTPException(status_code=400, detail="Razorpay keys missing.")
        if not (req.razorpay_payment_id and req.razorpay_subscription_id and req.razorpay_signature):
            raise HTTPException(status_code=400, detail="Payment not completed.")
        user_id = payload.get("uid")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user.")

        signature_payload = f"{req.razorpay_payment_id}|{req.razorpay_subscription_id}"
        digest = hmac.new(
            settings["key_secret"].encode("utf-8"),
            signature_payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        if digest != req.razorpay_signature:
            raise HTTPException(status_code=400, detail="Invalid signature.")

        client = _razorpay_client()
        sub_data = client.subscription.fetch(req.razorpay_subscription_id)
        if sub_data.get("status") != "active":
            raise HTTPException(status_code=400, detail="Payment not completed.")
        pay_data = client.payment.fetch(req.razorpay_payment_id)
        if pay_data.get("status") != "captured":
            raise HTTPException(status_code=400, detail="Payment not completed.")

        latest = await get_latest_subscription(pool, user_id)
        if not latest or latest.get("razorpay_subscription_id") != req.razorpay_subscription_id:
            raise HTTPException(status_code=400, detail="Subscription not found.")

        await ensure_default_plans(pool, DEFAULT_PLAN_CONFIG)
        plan = await get_plan_by_name(pool, latest.get("plan_name"))
        if not plan:
            raise HTTPException(status_code=400, detail="Plan configuration missing.")

        # Cancel any previous active subscription before activating the new one.
        active = await get_active_subscription(pool, user_id)
        carryover_days = 0
        if active and active.get("id") != latest.get("id"):
            prev_end = active.get("end_date")
            if prev_end:
                if prev_end.tzinfo is None:
                    prev_end = prev_end.replace(tzinfo=timezone.utc)
                carryover_days = max((prev_end - datetime.now(timezone.utc)).days, 0)
            if active.get("razorpay_subscription_id"):
                client = _razorpay_client()
                _cancel_razorpay_subscription(client, active.get("razorpay_subscription_id"))
            await update_subscription_status(
                pool,
                subscription_id=active.get("id"),
                status="cancelled",
                end_date=datetime.now(timezone.utc),
            )

        start_date = datetime.now(timezone.utc)
        end_date = start_date + timedelta(days=plan["duration_days"] + carryover_days)
        await activate_subscription(pool, latest["id"], start_date, end_date)
        await create_payment(
            pool,
            user_id=user_id,
            subscription_id=latest["id"],
            amount=plan["amount"],
            currency=plan["currency"],
            status="captured",
            razorpay_payment_id=req.razorpay_payment_id,
            raw=req.dict(),
        )

        return {"status": "active", "end_date": end_date.isoformat()}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Verification failed: {exc}")
