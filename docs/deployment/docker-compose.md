# Docker Compose

The image is published to the GitHub Container Registry for `linux/amd64` and `linux/arm64`:

- `latest` and `2`, `2.0`, `2.0.0` ...: releases;
- `master`: the current development state.

This `docker-compose.yml` runs the service for one domain whose IMAP and SMTP are on `mail.example.com`, without POP3:

```yaml
{!../docker-compose.yml!}
```

Start it with `docker compose up -d`, then put a [reverse proxy](reverse-proxy.md) in front. The service only listens on port 8000 of the host's loopback interface; it does not terminate HTTPS itself.

The container runs as an unprivileged user (UID 1000) and needs no volumes: all its state is in the environment.

To check what it answers, see [Troubleshooting](../troubleshooting.md).
