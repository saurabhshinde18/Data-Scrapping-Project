from t_platform.product.api.admin_api import admin_router
from t_platform.product.api.analytics_api import analytics_router
from t_platform.product.api.auth_api import auth_router
from t_platform.product.api.product_api import router as product_router
from t_platform.product.api.subscription_api import subscription_router

__all__ = [
    "admin_router",
    "analytics_router",
    "auth_router",
    "product_router",
    "subscription_router",
]
