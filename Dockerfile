FROM node:22-alpine
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat openssl
COPY package.json ./
RUN npm install
COPY . .
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/yoikiji?schema=public
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh","-c","npx prisma migrate deploy && npm run start"]
