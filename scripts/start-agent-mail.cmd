@echo off
cd /d "%~dp0\..\infra\agent-mail\mcp_agent_mail"
set HTTP_HOST=127.0.0.1
set HTTP_PORT=8765
set HTTP_ALLOW_LOCALHOST_UNAUTHENTICATED=true
set PYTHONPATH=src
.venv\Scripts\python.exe -c "from mcp_agent_mail.cli import app; app()" -- serve-http
