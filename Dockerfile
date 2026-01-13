# BASE STAGE
FROM    node:22-slim AS base
WORKDIR /app

# DEV STAGE
FROM    base AS dev
EXPOSE  5173
EXPOSE  3000
COPY    ./ ./
RUN     npm ci
CMD     ["npx", "pm2-runtime", "start", "ecosystem.config.cjs"]

# BUILD STAGE
FROM    base AS build
COPY    ./ ./
RUN     npm ci
RUN     npx tailwindcss -i ./src/frontend/src/styles/input.css -o ./src/frontend/src/styles/output.css --minify
RUN     cd src/frontend && npx vite build --outDir ../../dist/frontend
RUN     npx tsc ./src/frontend/server.ts --outDir ./dist/frontend --module NodeNext --target es2023 --moduleResolution nodenext --skipLibCheck
RUN     npx tsc

# PROD STAGE
FROM    base AS prod
EXPOSE  3001
RUN     apt-get update && apt-get install -y python3 make g++
COPY    --from=build app/package*.json                  ./
COPY    --from=build app/ecosystem.config.cjs           ./
COPY    --from=build app/dist                           ./dist
COPY    --from=build app/src/backend/src/Routes/uploads ./dist/src/Routes/uploads
RUN     npm ci --omit=dev
CMD     ["npx", "pm2-runtime", "start", "ecosystem.config.cjs"]
