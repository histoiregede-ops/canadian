#!/bin/sh
# Substitue les variables d'environnement dans nginx.conf
# puis démarre nginx

# Valeurs par défaut
export DOMAIN_CLIENT="${DOMAIN_CLIENT:-localhost}"
export DOMAIN_STAFF="${DOMAIN_STAFF:-localhost}"
export BACKEND_HOST="${BACKEND_HOST:-backend}"
export BACKEND_PORT="${BACKEND_PORT:-3000}"

# Appliquer les variables au template
envsubst '${DOMAIN_CLIENT} ${DOMAIN_STAFF} ${BACKEND_HOST} ${BACKEND_PORT}' \
  < /etc/nginx/conf.d/default.conf \
  > /tmp/nginx.conf && \
  mv /tmp/nginx.conf /etc/nginx/conf.d/default.conf

# Démarrer nginx
exec nginx -g "daemon off;"