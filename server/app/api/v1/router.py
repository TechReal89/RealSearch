from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.credits import router as credits_router
from app.api.v1.payments import router as payments_router
from app.api.v1.admin.dashboard import router as admin_dashboard_router
from app.api.v1.admin.users import router as admin_users_router
from app.api.v1.admin.jobs import router as admin_jobs_router
from app.api.v1.admin.settings import router as admin_settings_router
from app.api.v1.admin.packages import router as admin_packages_router
from app.api.v1.admin.payments import router as admin_payments_router
from app.api.v1.admin.tiers import router as admin_tiers_router
from app.api.v1.admin.monitoring import router as admin_monitoring_router
from app.api.v1.admin.promotions import router as admin_promotions_router
from app.api.v1.admin.server_monitor import router as admin_server_monitor_router

api_router = APIRouter(prefix="/api/v1")

# User routes
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(jobs_router)
api_router.include_router(credits_router)
api_router.include_router(payments_router)

# Admin routes
api_router.include_router(admin_dashboard_router)
api_router.include_router(admin_users_router)
api_router.include_router(admin_jobs_router)
api_router.include_router(admin_settings_router)
api_router.include_router(admin_packages_router)
api_router.include_router(admin_payments_router)
api_router.include_router(admin_tiers_router)
api_router.include_router(admin_monitoring_router)
api_router.include_router(admin_promotions_router)
api_router.include_router(admin_server_monitor_router)
