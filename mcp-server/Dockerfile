FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY mcp-server ./mcp-server

ENV PORT=8080
EXPOSE 8080
CMD ["node", "mcp-server/server.mjs"]
