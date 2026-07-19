FROM node:20-alpine AS backend

WORKDIR /app/back
COPY back/package*.json ./
RUN npm install --omit=dev
COPY back/ .
EXPOSE 3000
CMD ["node", "index.js"]

FROM node:20-alpine AS frontend

WORKDIR /app/front
COPY front/package*.json ./
RUN npm ci
COPY front/ .
RUN npm run build -- --configuration production

FROM nginx:alpine AS production

COPY --from=frontend /app/front/dist/front/browser /usr/share/nginx/html
COPY --from=backend /app/back /app/back
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN apk add --no-cache nodejs npm && \
    cd /app/back && npm install --omit=dev

EXPOSE 80
CMD ["sh", "-c", "node /app/back/index.js & nginx -g 'daemon off;'"]
