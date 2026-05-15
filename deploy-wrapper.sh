#!/bin/bash
# Wrapper script for deploy that ensures clean environment
# This script is called via nsenter from dashboard container

# Clear all inherited environment except essentials
unset NODE_ENV

# Workspace path - can be overridden via WORKSPACE_DIR env variable
# Default: /home/deploy/lena (new location, was /root/lena)
WORKSPACE_DIR="${WORKSPACE_DIR:-/home/deploy/lena}"

# Set up clean PATH
export PATH="/root/.nvm/versions/node/v24.11.1/bin:/root/.bun/bin:${WORKSPACE_DIR}/node_modules/.bin:/usr/local/bin:/usr/bin:/bin"
export HOME="/root"
export NVM_DIR="/root/.nvm"

# Load nvm
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# Change to workspace
cd "$WORKSPACE_DIR"

# Run the actual deploy script with all arguments
exec "${WORKSPACE_DIR}/deploy-affected.sh" "$@"
