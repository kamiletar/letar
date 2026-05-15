#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -d "mcp_agent_mail" ]; then
  git clone https://github.com/Dicklesworthstone/mcp_agent_mail.git
fi
cd mcp_agent_mail
uv venv -p 3.14
uv sync
echo "Установлено. Запуск: scripts/start-agent-mail.sh"
