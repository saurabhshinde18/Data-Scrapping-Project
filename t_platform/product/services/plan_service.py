import json

import asyncpg


async def ensure_default_plans(pool: asyncpg.Pool, defaults: dict) -> None:
    async with pool.acquire() as connection:
        rows = await connection.fetch("SELECT name FROM plan_pricing")
        existing = {row.get("name") for row in rows}
        for name, config in defaults.items():
            if name in existing:
                continue
            await connection.execute(
                """
                INSERT INTO plan_pricing (
                    name, amount, currency, duration_days, razorpay_plan_id, description, features
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
                """,
                name,
                config.get("amount"),
                config.get("currency", "INR"),
                config.get("duration_days", 30),
                config.get("razorpay_plan_id"),
                config.get("description"),
                json.dumps(config.get("features") or []),
            )


async def list_plans(pool: asyncpg.Pool) -> list[dict]:
    async with pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT name, amount, currency, duration_days, razorpay_plan_id, description, features
            FROM plan_pricing
            ORDER BY name
            """
        )
    return [
        {
            "name": row.get("name"),
            "amount": float(row.get("amount")) if row.get("amount") is not None else 0,
            "currency": row.get("currency") or "INR",
            "duration_days": int(row.get("duration_days") or 0),
            "razorpay_plan_id": row.get("razorpay_plan_id"),
            "description": row.get("description"),
            "features": row.get("features") or [],
        }
        for row in rows
    ]


async def get_plan_by_name(pool: asyncpg.Pool, name: str) -> dict | None:
    async with pool.acquire() as connection:
        row = await connection.fetchrow(
            """
            SELECT name, amount, currency, duration_days, razorpay_plan_id, description, features
            FROM plan_pricing
            WHERE name = $1
            """,
            name,
        )
    if not row:
        return None
    return {
        "name": row.get("name"),
        "amount": float(row.get("amount")) if row.get("amount") is not None else 0,
        "currency": row.get("currency") or "INR",
        "duration_days": int(row.get("duration_days") or 0),
        "razorpay_plan_id": row.get("razorpay_plan_id"),
        "description": row.get("description"),
        "features": row.get("features") or [],
    }


async def update_plan(
    pool: asyncpg.Pool,
    name: str,
    amount: float | None = None,
    currency: str | None = None,
    duration_days: int | None = None,
    razorpay_plan_id: str | None = None,
    description: str | None = None,
    features: list[str] | None = None,
) -> dict:
    async with pool.acquire() as connection:
        existing = await connection.fetchrow(
            "SELECT name FROM plan_pricing WHERE name = $1",
            name,
        )
        if not existing:
            await connection.execute(
                """
                INSERT INTO plan_pricing (
                    name, amount, currency, duration_days, razorpay_plan_id, description, features
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
                """,
                name,
                amount or 0,
                currency or "INR",
                duration_days or 30,
                razorpay_plan_id,
                description,
                json.dumps(features or []),
            )
        else:
            await connection.execute(
                """
                UPDATE plan_pricing
                SET amount = COALESCE($2, amount),
                    currency = COALESCE($3, currency),
                    duration_days = COALESCE($4, duration_days),
                    razorpay_plan_id = COALESCE($5, razorpay_plan_id),
                    description = COALESCE($6, description),
                    features = COALESCE($7::jsonb, features),
                    updated_at = NOW()
                WHERE name = $1
                """,
                name,
                amount,
                currency,
                duration_days,
                razorpay_plan_id,
                description,
                json.dumps(features) if features is not None else None,
            )
    return await get_plan_by_name(pool, name)
