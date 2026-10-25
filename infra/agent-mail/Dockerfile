ARG BASE_IMAGE=ghcr.io/dicklesworthstone/mcp_agent_mail@sha256:d2c8f3fd632eeddb86aa5dc5398494946f9e6cfd0b470f517cc1082fac6ba470
FROM ${BASE_IMAGE}
COPY open_contact_default.py /tmp/letar-open-contact-default.py
RUN /app/.venv/bin/python /tmp/letar-open-contact-default.py
