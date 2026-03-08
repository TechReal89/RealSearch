"""Seed default data for RealSearch."""
import asyncio

from sqlalchemy import select, text

from app.config import settings
from app.database import async_session, engine, Base
from app.models import *  # noqa: F403


async def seed():
    async with async_session() as db:
        # Check if already seeded
        result = await db.execute(select(MembershipTierConfig).limit(1))
        if result.scalar_one_or_none():
            print("Database already seeded. Skipping.")
            return

        # === Membership Tiers ===
        tiers = [
            MembershipTierConfig(
                name="bronze", display_name="Cấp Đồng", color="#CD7F32",
                price_monthly=0, price_yearly=0,
                priority_level=1, daily_credit_limit=50, max_jobs=3,
                max_urls_per_job=10, max_clients=1, credit_earn_multiplier=1.0,
                allow_keyword_seo=False, allow_backlink=False, allow_social_media=False,
                allow_internal_click=False, allow_proxy=False, allow_scheduling=False,
                allow_priority_boost=False, allow_detailed_report=False, sort_order=1,
            ),
            MembershipTierConfig(
                name="silver", display_name="Cấp Bạc", color="#C0C0C0",
                price_monthly=99000, price_yearly=990000,
                priority_level=3, daily_credit_limit=200, max_jobs=10,
                max_urls_per_job=50, max_clients=2, credit_earn_multiplier=1.2,
                allow_keyword_seo=True, allow_backlink=False, allow_social_media=False,
                allow_internal_click=True, allow_proxy=False, allow_scheduling=False,
                allow_priority_boost=False, allow_detailed_report=False, sort_order=2,
            ),
            MembershipTierConfig(
                name="gold", display_name="Cấp Vàng", color="#FFD700",
                price_monthly=249000, price_yearly=2490000,
                priority_level=6, daily_credit_limit=500, max_jobs=30,
                max_urls_per_job=100, max_clients=3, credit_earn_multiplier=1.5,
                allow_keyword_seo=True, allow_backlink=True, allow_social_media=True,
                allow_internal_click=True, allow_proxy=True, allow_scheduling=True,
                allow_priority_boost=False, allow_detailed_report=True, sort_order=3,
            ),
            MembershipTierConfig(
                name="diamond", display_name="Cấp Kim Cương", color="#B9F2FF",
                price_monthly=499000, price_yearly=4990000,
                priority_level=10, daily_credit_limit=9999, max_jobs=100,
                max_urls_per_job=500, max_clients=5, credit_earn_multiplier=2.0,
                allow_keyword_seo=True, allow_backlink=True, allow_social_media=True,
                allow_internal_click=True, allow_proxy=True, allow_scheduling=True,
                allow_priority_boost=True, allow_detailed_report=True, sort_order=4,
            ),
        ]
        db.add_all(tiers)
        print("  + 4 membership tiers")

        # === Credit Packages ===
        packages = [
            CreditPackage(
                name="Gói Cơ Bản", credit_amount=500, bonus_credit=0,
                price=50000, sort_order=1,
            ),
            CreditPackage(
                name="Gói Tiết Kiệm", credit_amount=1200, bonus_credit=200,
                price=100000, badge="popular", sort_order=2,
            ),
            CreditPackage(
                name="Gói Chuyên Nghiệp", credit_amount=7000, bonus_credit=2800,
                price=500000, badge="best_value", sort_order=3,
            ),
            CreditPackage(
                name="Gói Doanh Nghiệp", credit_amount=15000, bonus_credit=7500,
                price=1000000, badge="hot", sort_order=4,
            ),
        ]
        db.add_all(packages)
        print("  + 4 credit packages")

        # === System Settings ===
        settings_data = [
            # Credit
            ("credit_per_viewlink", "1", "credit", "Credit/ViewLink",
             "Credit kiếm được khi hoàn thành 1 viewlink", "number"),
            ("credit_per_keyword", "3", "credit", "Credit/Keyword SEO",
             "Credit kiếm được khi hoàn thành 1 keyword SEO (tìm thấy)", "number"),
            ("credit_per_keyword_miss", "1", "credit", "Credit/Keyword (miss)",
             "Credit kiếm được khi keyword SEO không tìm thấy", "number"),
            ("credit_per_backlink", "2", "credit", "Credit/Backlink",
             "Credit kiếm được khi tạo 1 backlink", "number"),
            ("credit_per_social", "2", "credit", "Credit/Social",
             "Credit kiếm được khi hoàn thành 1 social view", "number"),
            ("credit_referral_bonus", "50", "credit", "Credit/Giới thiệu",
             "Credit thưởng khi giới thiệu thành công", "number"),
            ("credit_daily_bonus", "10", "credit", "Credit/Bonus ngày",
             "Credit thưởng khi hoàn thành 10+ tasks/ngày", "number"),
            ("credit_daily_bonus_min_tasks", "10", "credit", "Tasks/Bonus ngày",
             "Số tasks tối thiểu để nhận bonus ngày", "number"),
            # Task
            ("min_time_on_site", "15", "task", "Thời gian tối thiểu",
             "Thời gian tối thiểu trên trang (giây)", "number"),
            ("max_concurrent_tasks", "2", "task", "Tasks đồng thời",
             "Số task đồng thời tối đa mỗi client", "number"),
            ("task_timeout_seconds", "300", "task", "Timeout task",
             "Thời gian timeout cho task (giây)", "number"),
            ("task_max_retries", "2", "task", "Số lần thử lại",
             "Số lần thử lại tối đa khi task fail", "number"),
            ("client_rate_limit_per_hour", "30", "task", "Rate limit/giờ",
             "Số tasks tối đa mỗi giờ cho mỗi client", "number"),
            ("delay_between_tasks_min", "30", "task", "Delay min (giây)",
             "Thời gian delay tối thiểu giữa 2 tasks", "number"),
            ("delay_between_tasks_max", "120", "task", "Delay max (giây)",
             "Thời gian delay tối đa giữa 2 tasks", "number"),
            # General
            ("heartbeat_interval", "30", "general", "Heartbeat interval",
             "Chu kỳ heartbeat (giây)", "number"),
            ("heartbeat_timeout", "90", "general", "Heartbeat timeout",
             "Timeout khi mất heartbeat (giây)", "number"),
            ("max_clients_per_user", "3", "general", "Max clients/user",
             "Số client tối đa đồng thời mỗi user", "number"),
            ("max_clients_per_ip", "2", "general", "Max clients/IP",
             "Số client tối đa từ cùng IP", "number"),
            # Security
            ("min_task_time_ratio", "0.5", "security", "Tỉ lệ thời gian min",
             "Task bị reject nếu time < min_time * ratio", "number"),
            ("suspicious_success_rate", "0.99", "security", "Success rate nghi vấn",
             "Cảnh báo nếu success rate > giá trị này", "number"),
        ]
        for key, value, category, display_name, description, value_type in settings_data:
            db.add(SystemSetting(
                key=key, value=value, category=category,
                display_name=display_name, description=description, value_type=value_type,
            ))
        print(f"  + {len(settings_data)} system settings")

        # === Payment Channels ===
        channels = [
            PaymentChannel(
                name="momo", display_name="MoMo",
                config={}, is_active=False, sort_order=1,
            ),
            PaymentChannel(
                name="sepay", display_name="SePay",
                config={}, is_active=False, sort_order=2,
            ),
            PaymentChannel(
                name="bank_transfer", display_name="Chuyển khoản ngân hàng",
                config={}, is_active=False, sort_order=3,
            ),
        ]
        db.add_all(channels)
        print("  + 3 payment channels")

        await db.commit()
        print("Seed completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
