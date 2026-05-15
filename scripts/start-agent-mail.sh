#!/bin/bash
cd "$(dirname "$0")/../infra/agent-mail/mcp_agent_mail"
export HTTP_HOST=127.0.0.1
export HTTP_PORT=8765
export HTTP_ALLOW_LOCALHOST_UNAUTHENTICATED=true
export PYTHONPATH=src
.venv/Scripts/python.exe -c "from mcp_agent_mail.cli import app; app()" -- serve-http
