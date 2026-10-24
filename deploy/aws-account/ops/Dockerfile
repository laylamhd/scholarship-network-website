# =============================================================================
# "ops" container: one-off database jobs, run as an Amazon ECS task on AWS
# Fargate inside the VPC (it can reach the private RDS database; you cannot).
# Build context: the repository root.
# =============================================================================
FROM public.ecr.aws/docker/library/postgres:17-alpine
RUN apk add --no-cache bash aws-cli curl \
 && curl -fsSL -o /etc/rds-ca.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
 && chmod 644 /etc/rds-ca.pem
ENV PGSSLMODE=verify-full PGSSLROOTCERT=/etc/rds-ca.pem PGCONNECT_TIMEOUT=10
COPY deploy/aws/db/ /opt/tbhf/db/
COPY deploy/aws-account/ops/ops-task.sh /opt/tbhf/ops-task.sh
RUN chmod +x /opt/tbhf/ops-task.sh /opt/tbhf/db/import.sh
USER postgres
WORKDIR /tmp
ENTRYPOINT ["/opt/tbhf/ops-task.sh"]
CMD ["dbinit"]
