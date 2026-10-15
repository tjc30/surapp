#!/usr/bin/env bash
PID=$(pgrep -x surreal)
if [ -n "$PID" ]; then
    echo "SurrealDB is already running with PID $PID"
    exit 0
fi

mkdir -p /home/timu/surapp/data
setsid -f /home/timu/.surrealdb/surreal start  --bind 127.0.0.1:8000   --allow-all   surrealkv:///home/timu/surapp/data </dev/null >/home/timu/surapp/surreal.log 2>&1

sleep 1
PID=$(pgrep -x surreal)
if [ -n "$PID" ]; then
    #echo "SurrealDB started successfully with PID $PID on http://127.0.0.1:8000"
    echo "SurrealDB started successfully with PID $PID (listening on 127.0.0.1:8000)"
else
    echo "Failed to start SurrealDB. Check /home/timu/surapp/surreal.log"
    cat /home/timu/surapp/surreal.log
    exit 1
fi
