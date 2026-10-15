#!/usr/bin/env bash
PID=$(pgrep -x surreal)
if [ -n "$PID" ]; then
    echo "SurrealDB status: RUNNING (PID: $PID)"
    echo "Endpoint: http://localhost:8000"
    echo "Storage:  surrealkv:///home/timu/surapp/data"
    echo "Log:      /home/timu/surapp/surreal.log"
else
    echo "SurrealDB status: STOPPED"
fi
