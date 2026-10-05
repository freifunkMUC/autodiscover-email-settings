# Reverse proxy

Clients only use HTTPS (except for one redirect Outlook follows), so the service needs a reverse proxy that terminates TLS for `autoconfig.example.com` and `autodiscover.example.com`. See [DNS and certificates](../dns.md) for the names and the certificate.

## nginx

```nginx
# Outlook tries http://autodiscover.example.com/autodiscover/autodiscover.xml
# and follows a redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name autoconfig.example.com autodiscover.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name autoconfig.example.com autodiscover.example.com;

    ssl_certificate     /etc/letsencrypt/live/autoconfig.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/autoconfig.example.com/privkey.pem;

    location / {
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass http://127.0.0.1:8000;
    }
}
```

The `Host` header matters: the [Autodiscover v2](../clients/outlook.md#new-outlook-and-microsofts-cloud-setup) response contains a URL built from it.

### The bare domain

Thunderbird also asks `https://example.com/.well-known/autoconfig/mail/config-v1.1.xml`, and Outlook `https://example.com/autodiscover/autodiscover.xml`. If your website is served by nginx too, forward both paths from its server block:

```nginx
location /.well-known/autoconfig/ {
    proxy_set_header Host $host;
    proxy_pass http://127.0.0.1:8000;
}

location ~* ^/autodiscover/ {
    proxy_set_header Host $host;
    proxy_pass http://127.0.0.1:8000;
}
```

## Traefik

With Traefik as the Docker proxy, replace the `ports` of the [Compose service](docker-compose.md) with labels. This assumes an entry point `websecure` and a certificate resolver `letsencrypt` in your Traefik configuration:

```yaml
    labels:
      - traefik.enable=true
      - traefik.http.routers.autodiscover.rule=Host(`autoconfig.example.com`) || Host(`autodiscover.example.com`)
      - traefik.http.routers.autodiscover.entrypoints=websecure
      - traefik.http.routers.autodiscover.tls.certresolver=letsencrypt
      - traefik.http.services.autodiscover.loadbalancer.server.port=8000
```
