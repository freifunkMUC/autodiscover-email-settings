# systemd

Without Docker, the service runs on Node.js 22 or later.

```sh
git clone https://github.com/freifunkMUC/autodiscover-email-settings.git /srv/autodiscover
cd /srv/autodiscover
git checkout v2.0.0   # or the newest release
npm ci --omit=dev
```

Put the configuration in `/etc/autodiscover.env`; [Configuration](../configuration.md) lists every variable:

```sh
DOMAIN=example.com
IMAP_HOST=mail.example.com
SMTP_HOST=mail.example.com
POP_HOST=
```

and the unit in `/etc/systemd/system/autodiscover.service`:

```ini
[Unit]
Description=Autodiscover Email Settings
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/autodiscover
EnvironmentFile=/etc/autodiscover.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node index.js
Restart=on-failure

DynamicUser=yes
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
```

```sh
systemctl daemon-reload
systemctl enable --now autodiscover
journalctl -u autodiscover
```

It listens on port 8000 (`PORT` changes that) without TLS; put a [reverse proxy](reverse-proxy.md) in front.
