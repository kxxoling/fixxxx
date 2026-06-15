FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production

COPY src src

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
