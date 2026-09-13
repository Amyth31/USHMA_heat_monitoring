FROM node:20-slim AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
ENV NEXT_PUBLIC_API_BASE=http://localhost:5000/api
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000
CMD ["npm", "start"]
