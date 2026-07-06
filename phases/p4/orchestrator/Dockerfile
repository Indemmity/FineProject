FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

ENV NODE_ENV=production
ENV PORT=8100

EXPOSE 8100

CMD ["npx", "tsx", "src/main.ts"]
