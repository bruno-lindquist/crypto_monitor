#!/bin/bash
# Use Bash to run the script when it is opened from Finder or Terminal.

# Move into the folder where this file lives so every command runs from the project root.
cd "$(dirname "$0")"

# Check whether Docker is already available; if not, open Docker Desktop.
docker info >/dev/null 2>&1 || open -a Docker

# Wait until the Docker daemon is ready to accept commands before starting the stack.
until docker info >/dev/null 2>&1; do sleep 2; done

# Build images if needed and start all services in the background.
docker compose up -d --build

# Frontend URL exposed by this project after Docker starts the app.
URL=http://localhost:3000/

# Keep checking the frontend until it responds successfully, so the browser opens at the right time.
until curl -fsS "$URL" >/dev/null 2>&1; do sleep 2; done

# Open the app URL with the default browser; -n asks macOS for a new app instance when possible.
open -n "$URL"
