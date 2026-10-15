#!/usr/bin/env bash

BACKEND_PID=$(pgrep -f surapp-backend || true)
if [ -n "$BACKEND_PID" ]; then
    echo "Stopping Axum backend (PID: $BACKEND_PID)..."
    kill $BACKEND_PID
    echo "Axum backend stopped."
else
    echo "Axum backend is not running."
fi
