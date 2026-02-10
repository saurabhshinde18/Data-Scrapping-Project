from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from t_platform.product.api.routes import (
    admin_router,
    analytics_router,
    auth_router,
    product_router,
    subscription_router,
)
from t_platform.product.db import create_pool, init_db

def _load_env():
    current = Path(__file__).resolve()
    for parent in current.parents:
        candidate = parent / ".env"
        if candidate.exists():
            load_dotenv(candidate)
            return
    load_dotenv()


_load_env()

app = FastAPI(title="Product Scraping API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(product_router, prefix="/product")
app.include_router(auth_router, prefix="/auth")
app.include_router(subscription_router, prefix="/subscriptions")
app.include_router(admin_router, prefix="/admin")
app.include_router(analytics_router, prefix="/analytics")


@app.on_event("startup")
async def startup():
    app.state.db = await create_pool()
    await init_db(app.state.db)


@app.on_event("shutdown")
async def shutdown():
    pool = getattr(app.state, "db", None)
    if pool:
        await pool.close()
