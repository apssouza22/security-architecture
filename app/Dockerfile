# Stage 1: Build the Node.js application
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN #npm install
COPY . .

# Stage 2: Set up Nginx and serve the Node.js application
FROM nginx:1.27.2-alpine
COPY --from=build /app /app
COPY nginx.conf /etc/nginx/nginx.conf
COPY command.sh command.sh

RUN apk add --no-cache nodejs npm
RUN apk add --no-cache iptables

EXPOSE 80 81 7000
CMD ["sh", "command.sh"]

