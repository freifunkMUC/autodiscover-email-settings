FROM node:26.13.0-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216

# The base only carries ca-certificates-bundle, which still holds the eMudhra and
# Comodo AAA roots Mozilla removed; the ca-certificates package regenerates the store.
# The upgrade brings in fixes the base image does not have yet; the daily rebuild
# republishes only while the published image still has upgrades pending.
RUN apk upgrade --no-cache && apk add --no-cache ca-certificates

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