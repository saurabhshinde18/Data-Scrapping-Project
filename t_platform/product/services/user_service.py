from datetime import datetime, timezone, timedelta
import json
from typing import Optional

import asyncpg


async def get_user_by_email(pool: asyncpg.Pool, email: str) -> Optional[asyncpg.Record]:
    async with pool.acquire() as connection:
        return await connection.fetchrow(
            "SELECT * FROM users WHERE email = $1", email
        )


async def get_user_by_id(pool: asyncpg.Pool, user_id: int) -> Optional[asyncpg.Record]:
    async with pool.acquire() as connection:
        return await connection.fetchrow(
            "SELECT * FROM users WHERE id = $1", user_id
        )


async def update_user_password(
    pool: asyncpg.Pool, user_id: int, password_hash: str
) -> None:
    async with pool.acquire() as connection:
        await connection.execute(
            "UPDATE users SET password_hash = $2 WHERE id = $1",
            user_id,
            password_hash,
        )


async def create_password_reset(
    pool: asyncpg.Pool, user_id: int, token_hash: str, expires_at: datetime
) -> None:
    async with pool.acquire() as connection:
        await connection.execute(
            """
            INSERT INTO password_resets (user_id, token_hash, expires_at)
            VALUES ($1, $2, $3)
            """,
            user_id,
            token_hash,
            expires_at,
        )


async def get_password_reset_by_hash(
    pool: asyncpg.Pool, token_hash: str
) -> Optional[asyncpg.Record]:
    async with pool.acquire() as connection:
        return await connection.fetchrow(
            """
            SELECT pr.*, u.email
            FROM password_resets pr
            JOIN users u ON u.id = pr.user_id
            WHERE pr.token_hash = $1
            ORDER BY pr.created_at DESC
            LIMIT 1
            """,
            token_hash,
        )


async def mark_password_reset_used(pool: asyncpg.Pool, reset_id: int) -> None:
    async with pool.acquire() as connection:
        await connection.execute(
            "UPDATE password_resets SET used_at = NOW() WHERE id = $1",
            reset_id,
        )


async def record_search_usage(pool: asyncpg.Pool, user_id: int) -> None:
    async with pool.acquire() as connection:
        await connection.execute(
            "INSERT INTO search_usage (user_id) VALUES ($1)",
            user_id,
        )


async def count_searches_this_month(pool: asyncpg.Pool, user_id: int) -> int:
    async with pool.acquire() as connection:
        count = await connection.fetchval(
            """
            SELECT COUNT(*)
            FROM search_usage
            WHERE user_id = $1
              AND created_at >= date_trunc('month', NOW())
            """,
            user_id,
        )
    return int(count or 0)


async def create_user(
    pool: asyncpg.Pool,
    email: str,
    password_hash: str,
    role: str = "user",
    full_name: str | None = None,
    username: str | None = None,
    phone_code: str | None = None,
    phone_number: str | None = None,
    admin_invited: bool = False,
    invited_at: datetime | None = None,
    invited_by: str | None = None,
) -> asyncpg.Record:
    async with pool.acquire() as connection:
        return await connection.fetchrow(
            """
            INSERT INTO users (
                email, password_hash, role, full_name, username,
                phone_code, phone_number, admin_invited, invited_at, invited_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            """,
            email,
            password_hash,
            role,
            full_name,
            username,
            phone_code,
            phone_number,
            admin_invited,
            invited_at,
            invited_by,
        )


async def get_active_subscription(pool: asyncpg.Pool, user_id: int) -> Optional[asyncpg.Record]:
    async with pool.acquire() as connection:
        return await connection.fetchrow(
            """
            SELECT *
            FROM subscriptions
            WHERE user_id = $1
              AND status = 'active'
              AND (end_date IS NULL OR end_date >= NOW())
            ORDER BY end_date DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            user_id,
        )


async def get_latest_subscription(pool: asyncpg.Pool, user_id: int) -> Optional[asyncpg.Record]:
    async with pool.acquire() as connection:
        return await connection.fetchrow(
            """
            SELECT *
            FROM subscriptions
            WHERE user_id = $1
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """,
            user_id,
        )


async def create_subscription(
    pool: asyncpg.Pool,
    user_id: int,
    plan_name: str,
    amount: float,
    currency: str,
    razorpay_subscription_id: str | None = None,
    razorpay_customer_id: str | None = None,
) -> asyncpg.Record:
    async with pool.acquire() as connection:
        return await connection.fetchrow(
            """
            INSERT INTO subscriptions (
                user_id, plan_name, status, start_date, end_date,
                razorpay_subscription_id, razorpay_customer_id, amount, currency
            )
            VALUES ($1, $2, 'pending', NULL, NULL, $3, $4, $5, $6)
            RETURNING *
            """,
            user_id,
            plan_name,
            razorpay_subscription_id,
            razorpay_customer_id,
            amount,
            currency,
        )


async def activate_subscription(
    pool: asyncpg.Pool,
    subscription_id: int,
    start_date: datetime,
    end_date: datetime,
) -> None:
    async with pool.acquire() as connection:
        await connection.execute(
            """
            UPDATE subscriptions
            SET status = 'active',
                start_date = $2,
                end_date = $3,
                updated_at = NOW()
            WHERE id = $1
            """,
            subscription_id,
            start_date,
            end_date,
        )


async def update_subscription_status(
    pool: asyncpg.Pool,
    subscription_id: int,
    status: str,
    end_date: datetime | None = None,
) -> None:
    async with pool.acquire() as connection:
        await connection.execute(
            """
            UPDATE subscriptions
            SET status = $2,
                end_date = COALESCE($3, end_date),
                updated_at = NOW()
            WHERE id = $1
            """,
            subscription_id,
            status,
            end_date,
        )


async def create_payment(
    pool: asyncpg.Pool,
    user_id: int,
    subscription_id: int | None,
    amount: float,
    currency: str,
    status: str,
    razorpay_payment_id: str | None,
    raw: dict | None = None,
) -> None:
    raw_payload = json.dumps(raw) if isinstance(raw, dict) else raw
    async with pool.acquire() as connection:
        await connection.execute(
            """
            INSERT INTO payments (
                user_id, subscription_id, amount, currency, status, razorpay_payment_id, raw
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            user_id,
            subscription_id,
            amount,
            currency,
            status,
            razorpay_payment_id,
            raw_payload,
        )


async def list_users_with_subscription(pool: asyncpg.Pool) -> list[dict]:
    async with pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                u.id,
                u.email,
                u.full_name,
                u.username,
                u.phone_code,
                u.phone_number,
                u.created_at,
                s.plan_name,
                s.status,
                s.start_date,
                s.end_date,
                s.amount,
                s.currency
            FROM users u
            LEFT JOIN LATERAL (
                SELECT *
                FROM subscriptions
                WHERE user_id = u.id
                ORDER BY created_at DESC, id DESC
                LIMIT 1
            ) s ON TRUE
            WHERE u.role = 'user'
            ORDER BY u.created_at DESC
            """
        )
    results = []
    now = datetime.now(timezone.utc)
    for row in rows:
        end_date = row.get("end_date")
        remaining_days = None
        if end_date:
            if end_date.tzinfo is None:
                end_date = end_date.replace(tzinfo=timezone.utc)
            remaining_days = max((end_date - now).days, 0)
        results.append(
            {
                "id": row.get("id"),
                "email": row.get("email"),
                "full_name": row.get("full_name"),
                "username": row.get("username"),
                "phone_code": row.get("phone_code"),
                "phone_number": row.get("phone_number"),
                "created_at": row.get("created_at").isoformat() if row.get("created_at") else None,
                "plan_name": row.get("plan_name"),
                "status": row.get("status") or "none",
                "start_date": row.get("start_date").isoformat() if row.get("start_date") else None,
                "end_date": row.get("end_date").isoformat() if row.get("end_date") else None,
                "remaining_days": remaining_days,
                "amount": float(row.get("amount")) if row.get("amount") is not None else None,
                "currency": row.get("currency"),
            }
        )
    return results


async def get_user_registration_series(pool: asyncpg.Pool, days: int) -> list[dict]:
    if days <= 0:
        return []
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days - 1)
    start_day = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)

    async with pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT date_trunc('day', created_at) AS day, COUNT(*) AS total
            FROM users
            WHERE role = 'user'
              AND created_at >= $1
            GROUP BY day
            ORDER BY day
            """,
            start_day,
        )

    totals = {}
    for row in rows:
        day = row.get("day")
        if day and day.tzinfo is None:
            day = day.replace(tzinfo=timezone.utc)
        key = day.date().isoformat() if day else None
        if key:
            totals[key] = int(row.get("total") or 0)

    series = []
    for i in range(days):
        day = start_day + timedelta(days=i)
        key = day.date().isoformat()
        series.append({"date": key, "count": totals.get(key, 0)})
    return series
async def admin_metrics(pool: asyncpg.Pool) -> dict:
    async with pool.acquire() as connection:
        total_users = await connection.fetchval(
            "SELECT COUNT(*) FROM users WHERE role = 'user'"
        )
        active_subscribers = await connection.fetchval(
            """
            SELECT COUNT(*)
            FROM subscriptions
            WHERE status = 'active'
              AND (end_date IS NULL OR end_date >= NOW())
            """
        )
        captured_revenue = await connection.fetchval(
            "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'captured'"
        )
        # Include active subscriptions that do not yet have a captured payment
        # so dashboard revenue reflects current subscribed users as well.
        pending_subscription_revenue = await connection.fetchval(
            """
            SELECT COALESCE(SUM(s.amount), 0)
            FROM subscriptions s
            LEFT JOIN payments p
              ON p.subscription_id = s.id
             AND p.status = 'captured'
            WHERE s.status = 'active'
              AND (s.end_date IS NULL OR s.end_date >= NOW())
              AND p.id IS NULL
            """
        )
        revenue = float(captured_revenue or 0) + float(pending_subscription_revenue or 0)
    return {
        "total_users": int(total_users or 0),
        "active_subscribers": int(active_subscribers or 0),
        "revenue": float(revenue or 0),
    }


async def delete_user(pool: asyncpg.Pool, user_id: int) -> None:
    async with pool.acquire() as connection:
        await connection.execute("DELETE FROM users WHERE id = $1", user_id)


async def list_admin_invites(pool: asyncpg.Pool) -> list[dict]:
    async with pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                id,
                email,
                full_name,
                username,
                phone_code,
                phone_number,
                admin_invited,
                invited_at,
                invited_by,
                created_at
            FROM users
            WHERE role = 'admin'
              AND admin_invited = TRUE
            ORDER BY invited_at DESC NULLS LAST, created_at DESC
            """
        )
    results = []
    for row in rows:
        results.append(
            {
                "id": row.get("id"),
                "email": row.get("email"),
                "full_name": row.get("full_name"),
                "username": row.get("username"),
                "phone_code": row.get("phone_code"),
                "phone_number": row.get("phone_number"),
                "admin_invited": bool(row.get("admin_invited")),
                "invited_at": row.get("invited_at").isoformat()
                if row.get("invited_at")
                else None,
                "invited_by": row.get("invited_by"),
                "created_at": row.get("created_at").isoformat()
                if row.get("created_at")
                else None,
            }
        )
    return results
