from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from t_platform.product.api.product_api import router
from t_platform.product.api.auth_api import auth_router

app = FastAPI(title="Product Scraping API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/product")
app.include_router(auth_router, prefix="/auth")
