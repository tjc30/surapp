#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure cargo, node, and surreal are in PATH
export PATH="$HOME/.cargo/bin:$HOME/.surrealdb:$PATH"

echo "=========================================================="
echo "  Starting Climate App (SurrealDB + Axum + React)"
echo "=========================================================="

# 1. Ensure SurrealDB is running
if ! pgrep -x surreal > /dev/null; then
    echo "[1/5] Starting SurrealDB..."
    "$DIR/start.sh"
else
    echo "[1/5] SurrealDB is running (PID: $(pgrep -x surreal))"
fi

# Wait up to 5 seconds for SurrealDB HTTP endpoint
for i in {1..10}; do
    if curl -s http://127.0.0.1:8000/health >/dev/null 2>&1 || curl -s -u root:root -H "surreal-ns: main" -H "surreal-db: main" http://127.0.0.1:8000/sql >/dev/null 2>&1; then
        break
    fi
    sleep 0.5
done

# 2. Verify that tables are loaded in SurrealDB
echo "[2/5] Checking SurrealDB tables..."
TEMPS_COUNT=$(curl -s -u root:root -H "surreal-ns: main" -H "surreal-db: main" -H "Accept: application/json" -d "SELECT count() FROM temps GROUP ALL;" http://127.0.0.1:8000/sql 2>/dev/null | grep -o '"count":[0-9]*' | cut -d: -f2 || echo "0")
if [ -z "$TEMPS_COUNT" ] || [ "$TEMPS_COUNT" -eq 0 ] 2>/dev/null; then
    echo "      Loading temperature data into SurrealDB..."
    python3 "$DIR/python/load_temps.py" --ns main --db main
else
    echo "      Table 'temps': $TEMPS_COUNT records loaded."
fi

CO2_COUNT=$(curl -s -u root:root -H "surreal-ns: main" -H "surreal-db: main" -H "Accept: application/json" -d "SELECT count() FROM co2 GROUP ALL;" http://127.0.0.1:8000/sql 2>/dev/null | grep -o '"count":[0-9]*' | cut -d: -f2 || echo "0")
if [ -z "$CO2_COUNT" ] || [ "$CO2_COUNT" -eq 0 ] 2>/dev/null; then
    echo "      Loading CO2 data with metadata into SurrealDB..."
    python3 "$DIR/python/load_co2.py" --ns main --db main
else
    echo "      Table 'co2': $CO2_COUNT records loaded."
fi

WILDFIRES_COUNT=$(curl -s -u root:root -H "surreal-ns: main" -H "surreal-db: main" -H "Accept: application/json" -d "SELECT count() FROM wildfires GROUP ALL;" http://127.0.0.1:8000/sql 2>/dev/null | grep -o '"count":[0-9]*' | cut -d: -f2 || echo "0")
if [ -z "$WILDFIRES_COUNT" ] || [ "$WILDFIRES_COUNT" -eq 0 ] 2>/dev/null; then
    echo "      Loading Canadian wildfires data into SurrealDB..."
    python3 "$DIR/python/load_wildfires.py" --ns main --db main
else
    echo "      Table 'wildfires': $WILDFIRES_COUNT records loaded."
fi

DROUGHT_COUNT=$(curl -s -u root:root -H "surreal-ns: main" -H "surreal-db: main" -H "Accept: application/json" -d "SELECT count() FROM drought_pdsi GROUP ALL;" http://127.0.0.1:8000/sql 2>/dev/null | grep -o '"count":[0-9]*' | cut -d: -f2 || echo "0")
if [ -z "$DROUGHT_COUNT" ] || [ "$DROUGHT_COUNT" -eq 0 ] 2>/dev/null; then
    echo "      Loading Drought PDSI data into SurrealDB..."
    "$DIR/.venv/bin/python" "$DIR/python/drought-plott.py"
else
    echo "      Table 'drought_pdsi': $DROUGHT_COUNT records loaded."
fi

FLOOD_COUNT=$(curl -s -u root:root -H "surreal-ns: main" -H "surreal-db: main" -H "Accept: application/json" -d "SELECT count() FROM flood_trends GROUP ALL;" http://127.0.0.1:8000/sql 2>/dev/null | grep -o '"count":[0-9]*' | cut -d: -f2 || echo "0")
if [ -z "$FLOOD_COUNT" ] || [ "$FLOOD_COUNT" -eq 0 ] 2>/dev/null; then
    echo "      Loading Flooding datasets into SurrealDB..."
    python3 "$DIR/python/load_flooding.py" --ns main --db main
else
    echo "      Table 'flood_trends': $FLOOD_COUNT records loaded."
fi

# Import new area datasets without replacing populated tables.
python3 "$DIR/python/load_area_data.py" --missing-only

# 3. Build frontend bundle (ensures latest UI with CO2 tab is ready)
echo "[3/5] Building frontend assets..."
cd "$DIR/frontend"

# Address memory and cache issues during Vite build
echo "      Clearing Vite cache and increasing Node.js memory limit..."
rm -rf node_modules/.vite
export NODE_OPTIONS="--max_old_space_size=4096"

npm run build

# 4. Compile backend if needed & restart Axum server
echo "[4/5] Preparing Axum backend (Rust)..."
cd "$DIR/backend"
if command -v cargo >/dev/null 2>&1; then
    cargo build --quiet || cargo build
fi

OLD_PID=$(pgrep -f surapp-backend || true)
if [ -n "$OLD_PID" ]; then
    echo "      Stopping previous backend process (PID: $OLD_PID)..."
    kill $OLD_PID 2>/dev/null || true
    sleep 1
fi

echo "      Launching fresh Axum backend..."
setsid -f ./target/debug/surapp-backend > "$DIR/backend/app.log" 2>&1
sleep 1

NEW_PID=$(pgrep -f surapp-backend || true)
if [ -z "$NEW_PID" ]; then
    echo "Error: Axum backend failed to start. Log output:"
    cat "$DIR/backend/app.log"
    exit 1
fi
echo "      Axum backend running (PID: $NEW_PID)"

# 5. Verify endpoints
echo "[5/5] Verifying API health..."
curl -s http://127.0.0.1:3000/api/health >/dev/null && echo "      API is responding."

echo ""
echo "=========================================================="
echo "  Climate App is live!"
echo "  URL:            http://localhost:3000"
echo "  Selection:      Global Avg. Temp, CO2 ppm, Canadian Wildfires, and Severe Droughts"
echo "  API endpoint:   http://localhost:3000/api/temps"
echo "  API CO2:        http://localhost:3000/api/co2"
echo "  API Wildfires:  http://localhost:3000/api/wildfires"
echo "  API Drought:    http://localhost:3000/api/drought"
echo "  API stats:      http://localhost:3000/api/stats"
echo "=========================================================="