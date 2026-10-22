FROM node:26.12.1-alpine

# The base only carries ca-certificates-bundle, which still holds the eMudhra and
# Comodo AAA roots Mozilla removed; the ca-certificates package regenerates the store.
RUN apk add --no-cache ca-certificates

ENV NODE_ENV=production

EXPOSE 8000

WORKDIR /app

# Install production dependencies using the locked versions for reproducible builds,
# then remove npm itself: it is not needed at runtime, and its bundled packages are
# what image scanners report.
COPY package.json package-lock.json ./
RUN set -ex; \
    node --version; \
    npm ci --omit=dev; \
    npm cache clean --force; \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Copy application files
COPY index.js settings.js ./
COPY views ./views

# Ensure the application directory is owned by an unprivileged user and run as that user
RUN chown -R 1000:1000 /app

USER 1000

CMD ["node", "index.js"]