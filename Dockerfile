# SkillHub backend — Bun + Hono
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Final image
FROM base AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY tsconfig.json ./
COPY src/ ./src/
COPY db/ ./db/

# Skills are stored here; mount a Railway volume at this path for persistence
RUN mkdir -p /app/skills-data

ENV NODE_ENV=production
ENV PORT=3000
ENV SKILLS_DIR=/app/skills-data

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
