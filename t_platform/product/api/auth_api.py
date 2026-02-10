from datetime import datetime, timedelta
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import logging
import aiosmtplib

import jwt
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from t_platform.product.services.user_service import (
    create_user,
    get_active_subscription,
    get_user_by_email,
    update_user_password,
    create_password_reset,
    get_password_reset_by_hash,
    mark_password_reset_used,
)

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_HOURS = 24

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@company.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)
RESET_BASE_URL = os.getenv("RESET_BASE_URL", "http://localhost:5173/reset-password")
RESET_TOKEN_TTL_MINUTES = int(os.getenv("RESET_TOKEN_TTL_MINUTES", "30"))
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").lower() == "true"
SMTP_TIMEOUT = int(os.getenv("SMTP_TIMEOUT", "20"))
SMTP_DEBUG = os.getenv("SMTP_DEBUG", "false").lower() == "true"

logger = logging.getLogger("auth")


def _get_smtp_settings() -> dict:
    host = os.getenv("SMTP_HOST", SMTP_HOST or "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", str(SMTP_PORT or 587)))
    user = os.getenv("SMTP_USER", SMTP_USER or "")
    password = os.getenv("SMTP_PASS", SMTP_PASS or "")
    sender = os.getenv("SMTP_FROM", SMTP_FROM or user)
    reset_base = os.getenv("RESET_BASE_URL", RESET_BASE_URL or "http://localhost:5173/reset-password")
    ttl = int(os.getenv("RESET_TOKEN_TTL_MINUTES", str(RESET_TOKEN_TTL_MINUTES or 30)))
    use_ssl = os.getenv("SMTP_USE_SSL", "true" if SMTP_USE_SSL else "false").lower() == "true"
    timeout = int(os.getenv("SMTP_TIMEOUT", str(SMTP_TIMEOUT or 20)))
    debug = os.getenv("SMTP_DEBUG", "true" if SMTP_DEBUG else "false").lower() == "true"
    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "sender": sender,
        "reset_base": reset_base,
        "ttl": ttl,
        "use_ssl": use_ssl,
        "timeout": timeout,
        "debug": debug,
    }



auth_router = APIRouter()
security = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str | None = None
    username: str | None = None
    phone_code: str | None = None
    phone_number: str | None = None


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _create_token(payload: dict) -> str:
    payload = payload.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=JWT_EXPIRES_HOURS)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def get_db_pool(request: Request):
    return request.app.state.db


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = _decode_token(credentials.credentials)
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin(payload: dict = Depends(get_current_user)) -> dict:
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return payload


async def require_active_subscription(
    payload: dict = Depends(get_current_user),
    pool=Depends(get_db_pool),
) -> dict:
    if payload.get("role") == "admin":
        return payload
    user_id = payload.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user token.")
    subscription = await get_active_subscription(pool, user_id)
    if not subscription:
        raise HTTPException(status_code=403, detail="Active subscription required.")
    return payload


@auth_router.post("/signup")
async def signup(req: SignupRequest, pool=Depends(get_db_pool)):
    email = req.email.strip().lower()
    if not email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")
    if email == ADMIN_EMAIL.lower():
        raise HTTPException(status_code=400, detail="Email already exists.")

    existing = await get_user_by_email(pool, email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists.")

    user = await create_user(
        pool,
        email=email,
        password_hash=_hash_password(req.password),
        role="user",
        full_name=req.full_name,
        username=req.username,
        phone_code=req.phone_code,
        phone_number=req.phone_number,
    )

    token = _create_token({"sub": email, "role": "user", "uid": user["id"]})
    return {"token": token, "user": {"email": email, "role": "user", "id": user["id"]}}


@auth_router.post("/login")
async def login(req: LoginRequest, pool=Depends(get_db_pool)):
    email = req.email.strip().lower()
    if not email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    if email == ADMIN_EMAIL.lower():
        if _hash_password(req.password) != _hash_password(ADMIN_PASSWORD):
            raise HTTPException(status_code=401, detail="Invalid credentials.")
        token = _create_token({"sub": email, "role": "admin"})
        return {"token": token, "user": {"email": email, "role": "admin"}}

    user = await get_user_by_email(pool, email)
    if not user or user.get("password_hash") != _hash_password(req.password):
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    role = user.get("role") or "user"
    token_payload = {"sub": email, "role": role, "uid": user["id"]}
    token = _create_token(token_payload)
    return {"token": token, "user": {"email": email, "role": role, "id": user["id"]}}


@auth_router.get("/me")
def me(payload: dict = Depends(get_current_user)):
    return {
        "email": payload.get("sub"),
        "role": payload.get("role"),
        "id": payload.get("uid"),
    }


@auth_router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, pool=Depends(get_db_pool)):
    email = req.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    if email == ADMIN_EMAIL.lower():
        raise HTTPException(status_code=400, detail="Contact support for admin reset.")
    smtp = _get_smtp_settings()
    if not (smtp["user"] and smtp["password"] and smtp["sender"]):
        raise HTTPException(status_code=500, detail="Email service not configured.")
    user = await get_user_by_email(pool, email)
    if not user:
        raise HTTPException(status_code=404, detail="Account not found.")
    token = secrets.token_urlsafe(32)
    token_hash = _hash_password(token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=smtp["ttl"])
    await create_password_reset(pool, user["id"], token_hash, expires_at)

    reset_link = f"{smtp['reset_base']}?token={token}"
    subject = "Reset your password"
    body = (
        f"Hi,\n\nUse the link below to reset your password. "
        f"This link expires in {smtp['ttl']} minutes.\n\n"
        f"{reset_link}\n\nIf you did not request this, ignore this email."
    )
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = smtp["sender"]
    msg["To"] = email
    msg.set_content(body)
    logger.info(
        "SMTP send: host=%s port=%s user=%s sender=%s ssl=%s debug=%s",
        smtp["host"],
        smtp["port"],
        smtp["user"],
        smtp["sender"],
        smtp["use_ssl"] or smtp["port"] == 465,
        smtp["debug"],
    )
    use_ssl = smtp["use_ssl"] or smtp["port"] == 465
    smtp_client = aiosmtplib.SMTP(
        hostname=smtp["host"],
        port=smtp["port"],
        timeout=smtp["timeout"],
        use_tls=use_ssl,
    )
    await smtp_client.connect()
    if not use_ssl:
        await smtp_client.starttls()
    await smtp_client.login(smtp["user"], smtp["password"])
    await smtp_client.send_message(msg)
    await smtp_client.quit()
    logger.info("SMTP send complete for %s", email)
    return {"ok": True}


@auth_router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, pool=Depends(get_db_pool)):
    token = req.token.strip()
    new_password = req.new_password.strip()
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token and new password are required.")
    token_hash = _hash_password(token)
    reset = await get_password_reset_by_hash(pool, token_hash)
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid reset token.")
    if reset.get("used_at"):
        raise HTTPException(status_code=400, detail="Reset token already used.")
    expires_at = reset.get("expires_at")
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token expired.")
    await update_user_password(pool, reset["user_id"], _hash_password(new_password))
    await mark_password_reset_used(pool, reset["id"])
    return {"ok": True}
