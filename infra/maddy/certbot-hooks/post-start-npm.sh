#!/bin/bash
# post-hook выполняется после любой попытки продления, в том числе неудачной: NPM всегда возвращаем.
docker start nginx-proxy-manager
