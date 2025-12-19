FROM node:25.2.1-alpine

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

# Ensure the application directory is owned by an unprivileged user and run as that user
RUN chown -R 1000:1000 /app

USER 1000

CMD ["node", "index.js"]