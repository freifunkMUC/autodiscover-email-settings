FROM node:24.12.0-alpine

ENV NODE_ENV=production

EXPOSE 8000

WORKDIR /app

# Install production dependencies using the frozen lockfile for reproducible builds
COPY package.json yarn.lock ./
RUN set -ex; \
    node --version; \
    yarn --version; \
    yarn install --production --frozen-lockfile --non-interactive; \
    yarn cache clean

# Copy application files
COPY index.js settings.js ./
COPY views ./views

CMD ["node", "index.js"]