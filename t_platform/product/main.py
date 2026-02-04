from fastapi import FastAPI
from t_platform.product.api.product_api import router

app = FastAPI(title="Product Scraping API")

app.include_router(router, prefix="/product")
