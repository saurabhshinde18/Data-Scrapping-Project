from datetime import datetime, timedelta
from pathlib import Path
import hashlib
import json
import os

import jwt
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel


USERS_FILE = Path("t_platform/product/storage/users.json")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_HOURS = 24

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@company.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

auth_router = APIRouter()
security = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    email: str
    password: str


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _load_users() -> list:
    if not USERS_FILE.exists():
        return []
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def _save_users(users: list) -> None:
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)


def _create_token(payload: dict) -> str:
    payload = payload.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=JWT_EXPIRES_HOURS)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


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


@auth_router.post("/signup")
def signup(req: SignupRequest):
    email = req.email.strip().lower()
    if not email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")
    if email == ADMIN_EMAIL.lower():
        raise HTTPException(status_code=400, detail="Email already exists.")

    users = _load_users()
    if any(u.get("email") == email for u in users):
        raise HTTPException(status_code=400, detail="Email already exists.")

    user = {"email": email, "password": _hash_password(req.password), "role": "user"}
    users.append(user)
    _save_users(users)

    token = _create_token({"sub": email, "role": "user"})
    return {"token": token, "user": {"email": email, "role": "user"}}


@auth_router.post("/login")
def login(req: LoginRequest):
    email = req.email.strip().lower()
    if not email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    if email == ADMIN_EMAIL.lower():
        if _hash_password(req.password) != _hash_password(ADMIN_PASSWORD):
            raise HTTPException(status_code=401, detail="Invalid credentials.")
        token = _create_token({"sub": email, "role": "admin"})
        return {"token": token, "user": {"email": email, "role": "admin"}}

    users = _load_users()
    user = next((u for u in users if u.get("email") == email), None)
    if not user or user.get("password") != _hash_password(req.password):
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    token = _create_token({"sub": email, "role": "user"})
    return {"token": token, "user": {"email": email, "role": "user"}}


@auth_router.get("/me")
def me(payload: dict = Depends(get_current_user)):
    return {"email": payload.get("sub"), "role": payload.get("role")}
