#!/bin/bash
# certbot standalone нужен порт 80, а его держит nginx-proxy-manager (tg-proxy). Останавливаем на время проверки.
docker stop nginx-proxy-manager
