#!/bin/bash

# Port to run the server on
PORT=8000
HOST="0.0.0.0"
SERVER_PID=""

echo "--- Wallet Engine Test Runner ---"

# Check if port is in use
if netstat -tln | grep -q ":$PORT "; then
    echo "1. Server appears to be running on port $PORT."
else
    echo "1. Starting Backend Server..."
    nohup uvicorn app.main:app --host $HOST --port $PORT > server.log 2>&1 &
    SERVER_PID=$!
    echo "Server PID: $SERVER_PID"
    echo "Waiting 5 seconds for server to initialize..."
    sleep 5
fi

echo "2. Running Integration Tests (Safety Verification)..."
python3 tests/test_safety.py
TEST_EXIT_CODE=$?

if [ -n "$SERVER_PID" ]; then
    echo "3. Cleaning up..."
    kill $SERVER_PID
fi

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "Tests passed (Vulnerability verified)."
    exit 0
else
    echo "Tests failed."
    exit 1
fi