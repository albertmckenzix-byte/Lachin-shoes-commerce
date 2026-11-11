"""
Automatic Periodic Scheduler for Lachin Shoes.
Uses APScheduler to run background maintenance tasks:
- Expire pending unpaid orders past their expiration deadline (every 10 minutes)
"""
import logging
import os
import sys

logger = logging.getLogger(__name__)

_scheduler = None


def run_expire_pending_orders_job():
    """Job executed periodically by the scheduler."""
    try:
        from shop.services.orders import expire_pending_orders
        count = expire_pending_orders()
        if count > 0:
            logger.info(f"[Scheduled Task] Expired {count} pending order(s) and released reserved stock.")
    except Exception as exc:
        logger.error(f"[Scheduled Task Error] Error expiring pending orders: {exc}")


def should_start_scheduler() -> bool:
    """
    Check if the scheduler should start in the current process.
    Prevents running during tests, migrations, collectstatic, or reloader parent processes.
    """
    args = sys.argv
    skip_commands = {"test", "makemigrations", "migrate", "collectstatic", "createsuperuser", "shell"}
    if any(cmd in args for cmd in skip_commands):
        return False

    # In dev 'runserver', only start in the reloader child process to avoid double execution
    if "runserver" in args and os.environ.get("RUN_MAIN") != "true":
        return False

    return True


def start_order_expiry_scheduler(interval_minutes: int = 10):
    """
    Initialize and start the background scheduler.
    Default interval: every 10 minutes.
    """
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        return _scheduler

    if not should_start_scheduler():
        return None

    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.interval import IntervalTrigger

        _scheduler = BackgroundScheduler(daemon=True)
        _scheduler.add_job(
            run_expire_pending_orders_job,
            trigger=IntervalTrigger(minutes=interval_minutes),
            id="expire_pending_orders_job",
            name="Expire unpaid orders past deadline",
            replace_existing=True,
            coalesce=True,
            max_instances=1,
        )
        _scheduler.start()
        logger.info(f"APScheduler started successfully: expire_pending_orders will run every {interval_minutes} minutes.")
        return _scheduler
    except Exception as exc:
        logger.warning(f"Could not start APScheduler: {exc}")
        return None


def get_scheduler_status() -> dict:
    """Return status information about the background scheduler."""
    is_running = _scheduler is not None and _scheduler.running
    next_run = None
    if is_running:
        job = _scheduler.get_job("expire_pending_orders_job")
        if job and job.next_run_time:
            next_run = job.next_run_time.isoformat()

    return {
        "running": is_running,
        "interval_minutes": 10,
        "next_run": next_run,
    }
