from __future__ import annotations

from datetime import datetime, timedelta, timezone

import asyncpg


async def record_visit(
    pool: asyncpg.Pool,
    path: str | None,
    visitor_id: str | None,
    user_agent: str | None,
) -> None:
    async with pool.acquire() as connection:
        await connection.execute(
            """
            INSERT INTO page_views (path, visitor_id, user_agent)
            VALUES ($1, $2, $3)
            """,
            path,
            visitor_id,
            user_agent,
        )


async def get_visit_series(pool: asyncpg.Pool, days: int) -> list[dict]:
    if days <= 0:
        return []
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days - 1)
    start_day = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)

    async with pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT date_trunc('day', visited_at) AS day, COUNT(*) AS total
            FROM page_views
            WHERE visited_at >= $1
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
