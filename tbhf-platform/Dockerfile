# =============================================================================
# TBHF Scholars Network — container image for Amazon ECS on AWS Fargate.
# Built by AWS CodeBuild and stored in Amazon ECR (deploy/aws-account/).
# Base images come from the ECR Public Gallery (no Docker Hub rate limits).
# =============================================================================
ARG NODE_IMAGE=public.ecr.aws/docker/library/node:22-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM ${NODE_IMAGE} AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PGSSLMODE=require \
    PGSSLROOTCERT=/app/rds-ca.pem
# Amazon RDS certificate bundle, so the database connection is verified TLS.
RUN wget -q -O /app/rds-ca.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
 && chmod 644 /app/rds-ca.pem \
 && addgroup -S tbhf && adduser -S -G tbhf tbhf
# Next.js "standalone" output: server.js + only the node_modules it needs.
COPY --from=build --chown=tbhf:tbhf /app/.next/standalone ./
COPY --from=build --chown=tbhf:tbhf /app/.next/static ./.next/static
COPY --from=build --chown=tbhf:tbhf /app/public ./public
USER tbhf
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/login || exit 1
CMD ["node", "server.js"]
