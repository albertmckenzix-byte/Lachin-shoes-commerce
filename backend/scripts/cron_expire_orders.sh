#!/bin/bash
# =============================================================================
# Cron script for Lachin Shoes: Expire pending unpaid orders & release stock
#
# Usage in Linux crontab (runs every 10 minutes):
# */10 * * * * /path/to/backend/scripts/cron_expire_orders.sh >> /var/log/lachin_expire_orders.log 2>&1
# =============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR" || exit 1

if [ -f "$PROJECT_DIR/venv/bin/python" ]; then
    PYTHON_BIN="$PROJECT_DIR/venv/bin/python"
else
    PYTHON_BIN="python3"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting expire_pending_orders task..."
$PYTHON_BIN manage.py expire_pending_orders
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Finished expire_pending_orders task."
