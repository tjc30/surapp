#!/usr/bin/env bash
PID=$(pgrep -x surreal)
if [ -n "$PID" ]; then
    echo "Stopping SurrealDB (PID: $PID)..."
    kill -TERM "$PID"
    sleep 2
    if pgrep -x "surreal" > /dev/null; then
        echo "Waiting for graceful shutdown..."
        sleep 2
    fi
    echo "SurrealDB stopped."
else
    echo "SurrealDB is not running."
fi
