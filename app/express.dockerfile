FROM node:16-buster-slim

ENV TZ='Europe/London'

# set env at build time for prisma
ARG DB_URL_WITH_PROTOCOL

WORKDIR /app

RUN apt-get update && apt-get install -y \
    openssl \
    libssl-dev

COPY ./web/package*.json .
RUN mkdir ./node_modules
RUN chown -R node:node /app/
COPY --chown=node:node  ./web .
RUN chmod +x ./init-db.sh

EXPOSE 3000

USER node

RUN npm ci --only=production

ENTRYPOINT [ "bash", "./init-db.sh" ]
