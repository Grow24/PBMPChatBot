# PBMP WhatsApp backend — Node + Python (math tools)
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PYTHON_BIN=python3
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
