# Build the Angular application.
FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Serve the compiled application with Nginx.
FROM nginx:alpine AS frontend
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/synapse/browser /usr/share/nginx/html
EXPOSE 80

# Run the collaboration WebSocket server.
FROM node:24-alpine AS websocket
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
EXPOSE 1234
CMD ["npx", "y-websocket"]
