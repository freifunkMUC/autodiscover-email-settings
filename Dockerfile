FROM node:20.9.0-slim

ENV NODE_ENV=production
ENV PORT=8000

WORKDIR /app

COPY package.json yarn.lock ./

RUN set -ex; \
    node --version; \
    yarn --version; \
    yarn install --frozen-lockfile --production; \
    yarn cache clean

COPY . .

EXPOSE $PORT

CMD ["node", "index.js"]