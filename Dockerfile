FROM node:lts-alpine

EXPOSE 8000

WORKDIR /app
COPY package.json yarn.lock index.js settings.js /app/

RUN set -ex; \
    node --version; \
    yarn --version; \
    yarn --prod; \
    yarn cache clean

COPY views /app/views

CMD ["node", "/app/index"]