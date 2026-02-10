import os
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

DEFAULT_DATABASE_URL = "postgresql+psycopg2://scrape_user:root@localhost:5432/data_scrape"


def _load_env():
    if os.getenv("DATABASE_URL"):
        return
    current = Path(__file__).resolve()
    for parent in current.parents:
        candidate = parent / ".env"
        if candidate.exists():
            load_dotenv(candidate)
            if os.getenv("DATABASE_URL"):
                return
            try:
                with candidate.open("r", encoding="utf-8") as handle:
                    for line in handle:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        key, value = line.split("=", 1)
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        if key and value and key not in os.environ:
                            os.environ[key] = value
            except OSError:
                pass
            return
    cwd_candidate = Path.cwd() / ".env"
    if cwd_candidate.exists():
        load_dotenv(cwd_candidate)
        if os.getenv("DATABASE_URL"):
            return
        try:
            with cwd_candidate.open("r", encoding="utf-8") as handle:
                for line in handle:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key and value and key not in os.environ:
                        os.environ[key] = value
        except OSError:
            pass
        return
    load_dotenv()
    if not os.getenv("DATABASE_URL"):
        os.environ["DATABASE_URL"] = DEFAULT_DATABASE_URL


_load_env()


def get_database_url() -> str:
    _load_env()
    url = os.getenv("DATABASE_URL", "")
    if not url:
        url = DEFAULT_DATABASE_URL
    if url.startswith("postgresql+psycopg2://"):
        return url.replace("postgresql+psycopg2://", "postgresql://", 1)
    return url


async def create_pool():
    database_url = get_database_url()
    return await asyncpg.create_pool(database_url, min_size=1, max_size=5)


async def init_db(pool: asyncpg.Pool) -> None:
    async with pool.acquire() as connection:
        await connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                full_name TEXT,
                username TEXT,
                phone_code TEXT,
                phone_number TEXT,
                admin_invited BOOLEAN NOT NULL DEFAULT FALSE,
                invited_at TIMESTAMPTZ,
                invited_by TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        await connection.execute(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS admin_invited BOOLEAN NOT NULL DEFAULT FALSE;
            """
        )
        await connection.execute(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
            """
        )
        await connection.execute(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS invited_by TEXT;
            """
        )
        await connection.execute(
            """
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                plan_name TEXT NOT NULL,
                status TEXT NOT NULL,
                start_date TIMESTAMPTZ,
                end_date TIMESTAMPTZ,
                razorpay_subscription_id TEXT,
                razorpay_customer_id TEXT,
                amount NUMERIC,
                currency TEXT DEFAULT 'INR',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        await connection.execute(
            """
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
                amount NUMERIC,
                currency TEXT DEFAULT 'INR',
                status TEXT,
                razorpay_payment_id TEXT,
                raw JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        await connection.execute(
            """
            CREATE TABLE IF NOT EXISTS password_resets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                used_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        await connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash
            ON password_resets(token_hash);
            """
        )
        await connection.execute(
            """
            CREATE TABLE IF NOT EXISTS search_usage (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        await connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_search_usage_user_time
            ON search_usage(user_id, created_at);
            """
        )
        await connection.execute(
            """
            CREATE TABLE IF NOT EXISTS plan_pricing (
                name TEXT PRIMARY KEY,
                amount NUMERIC NOT NULL,
                currency TEXT NOT NULL DEFAULT 'INR',
                duration_days INTEGER NOT NULL DEFAULT 30,
                razorpay_plan_id TEXT,
                description TEXT,
                features JSONB,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        await connection.execute(
            """
            CREATE TABLE IF NOT EXISTS page_views (
                id SERIAL PRIMARY KEY,
                path TEXT,
                visitor_id TEXT,
                user_agent TEXT,
                visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        await connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_page_views_visited_at
            ON page_views(visited_at);
            """
        )
        await connection.execute(
            """
            ALTER TABLE plan_pricing
            ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 30;
            """
        )
        await connection.execute(
            """
            ALTER TABLE plan_pricing
            ADD COLUMN IF NOT EXISTS razorpay_plan_id TEXT;
            """
        )
        await connection.execute(
            """
            ALTER TABLE plan_pricing
            ADD COLUMN IF NOT EXISTS description TEXT;
            """
        )
        await connection.execute(
            """
            ALTER TABLE plan_pricing
            ADD COLUMN IF NOT EXISTS features JSONB;
            """
        )
