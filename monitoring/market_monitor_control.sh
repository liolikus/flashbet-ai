#!/bin/bash

# FlashBet AI - Market Monitor Control Script
# Easy commands to start/stop/check the monitoring daemon

case "${1:-}" in
    start)
        echo "🚀 Starting Market Monitor Daemon..."
        sudo systemctl start flashbet-market-monitor
        sleep 2
        sudo systemctl status flashbet-market-monitor --no-pager
        echo ""
        echo "✅ Daemon started! It will check markets every 5 minutes."
        echo "📊 View logs: tail -f /tmp/market_monitor_daemon.log"
        ;;

    stop)
        echo "🛑 Stopping Market Monitor Daemon..."
        sudo systemctl stop flashbet-market-monitor
        echo "✅ Daemon stopped."
        ;;

    restart)
        echo "🔄 Restarting Market Monitor Daemon..."
        sudo systemctl restart flashbet-market-monitor
        sleep 2
        sudo systemctl status flashbet-market-monitor --no-pager
        ;;

    status)
        echo "📊 Market Monitor Daemon Status:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        sudo systemctl status flashbet-market-monitor --no-pager
        echo ""
        echo "Recent Log Entries:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        tail -10 /tmp/market_monitor_daemon.log 2>/dev/null || echo "No logs yet"
        ;;

    logs)
        echo "📋 Showing live logs (Ctrl+C to exit):"
        tail -f /tmp/market_monitor_daemon.log
        ;;

    enable)
        echo "🔧 Enabling daemon to start on boot..."
        sudo systemctl enable flashbet-market-monitor
        echo "✅ Daemon will start automatically on system boot"
        ;;

    disable)
        echo "🔧 Disabling daemon auto-start..."
        sudo systemctl disable flashbet-market-monitor
        echo "✅ Daemon will NOT start on boot"
        ;;

    *)
        echo "FlashBet AI - Market Monitor Control"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|enable|disable}"
        echo ""
        echo "Commands:"
        echo "  start      Start the monitoring daemon"
        echo "  stop       Stop the monitoring daemon"
        echo "  restart    Restart the monitoring daemon"
        echo "  status     Show current status and recent logs"
        echo "  logs       Show live log stream (Ctrl+C to exit)"
        echo "  enable     Enable auto-start on boot"
        echo "  disable    Disable auto-start on boot"
        echo ""
        echo "Configuration:"
        echo "  Min Markets: 5"
        echo "  Target Markets: 10"
        echo "  Check Interval: 5 minutes"
        echo "  Log File: /tmp/market_monitor_daemon.log"
        echo ""
        exit 1
        ;;
esac
