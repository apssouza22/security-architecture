# Stage 1: Build the Node.js application
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN #npm install
COPY . .

# Stage 2: Set up Nginx and serve the Node.js application
FROM nginx:1.25.3-alpine
COPY --from=build /app /app
COPY nginx.conf /etc/nginx/nginx.conf
RUN apk add --no-cache nodejs npm
EXPOSE 80 7000

# Start both Node.js and Nginx
CMD ["sh", "-c", "nginx -g 'daemon off;' & node /app/server.js"]
