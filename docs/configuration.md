# Configuration

The service is configured with environment variables. `DOMAIN` alone gives a working setup in which the servers are `imap.`, `pop.` and `smtp.` followed by the domain. Everything else adjusts that.

## General

| Variable | Default | Meaning |
| --- | --- | --- |
| `DOMAIN` | `example.com` | Your mail domain. The default server names are derived from it, and it completes logins entered without `@`. |
| `COMPANY_NAME` | `DOMAIN` | Name shown on the support page, in Thunderbird's account setup and in the configuration profile. |
| `SUPPORT_URL` | `https://` + `DOMAIN` | Link to your own help pages, passed on in the autoconfig and autodiscover responses. |
| `PORT` | `8000` | Port the service listens on. |
| `LOG_LEVEL` | `info` | `info` logs startup, every request and errors as JSON lines; `silent` or `none` turns logging off. |

Each request is logged with a `requestId`. A request ID the client sends in `X-Request-Id` is reused, otherwise one is generated; either way it comes back in the `X-Request-Id` response header.

## Mail servers

| Variable | Default | Meaning |
| --- | --- | --- |
| `IMAP_HOST` | `imap.` + `DOMAIN` | IMAP server. |
| `IMAP_PORT` | `993` | |
| `IMAP_SOCKET` | `SSL` | |
| `POP_HOST` | `pop.` + `DOMAIN` | POP3 server. |
| `POP_PORT` | `995` | |
| `POP_SOCKET` | `SSL` | |
| `SMTP_HOST` | `smtp.` + `DOMAIN` | SMTP submission server. |
| `SMTP_PORT` | `587` | |
| `SMTP_SOCKET` | `STARTTLS` | |

!!! warning "Turn off what you do not run"
    POP3 is announced by default. If your server has no POP3, set `POP_HOST=` (empty): an empty `*_HOST` leaves that protocol out of every response. Otherwise clients are offered a server that does not exist.

The socket type is one of:

- `SSL`: TLS from the first byte (implicit TLS), usually ports 993, 995 and 465;
- `STARTTLS`: a plain connection upgraded with STARTTLS, usually ports 143, 110 and 587;
- `plain`: no encryption. Avoid it.

The spelling does not matter, but any other value, such as `TLS`, stops the service at startup: clients would otherwise drop the server or connect without encryption.

## ActiveSync

Only needed if you run an ActiveSync server, such as Z-Push, SOGo or grommunio. See [ActiveSync](clients/activesync.md).

| Variable | Default | Meaning |
| --- | --- | --- |
| `MOBILESYNC_URL` | | The full ActiveSync endpoint, e.g. `https://sync.example.com/Microsoft-Server-ActiveSync`. |
| `MOBILESYNC_NAME` | `MOBILESYNC_URL` | Sent as the server name in the ActiveSync response. |
| `MOBILESYNC_AUTODISCOVER_JSON` | | `true` also offers ActiveSync to new Outlook for Windows. Read [the caveat](clients/outlook.md#activesync) first. |

## LDAP address book

Adds an LDAP address book to the configuration profile and its settings to the support page.

| Variable | Example | Meaning |
| --- | --- | --- |
| `LDAP_HOST` | `ldap.example.com` | LDAP server; without it, no LDAP settings are offered. |
| `LDAP_PORT` | `636` | |
| `LDAP_SOCKET` | `SSL` | `SSL` (or port 636) makes the profile use LDAPS. |
| `LDAP_BASE` | `dc=example,dc=com` | Search base. |
| `LDAP_USER_FIELD` | `uid` | The attribute that holds the user name ... |
| `LDAP_USER_BASE` | `ou=People,dc=example,dc=com` | ... and where the user entries are. Together they form the bind DN, `uid=alice,ou=People,dc=example,dc=com`. |
| `LDAP_SEARCH` | `(objectClass=inetOrgPerson)` | Search filter, shown on the support page. |

## Apple configuration profiles

Both are optional. See [Apple devices](clients/apple.md).

| Variable | Default | Meaning |
| --- | --- | --- |
| `PROFILE_IDENTIFIER` | reversed `DOMAIN` + `.autodiscover` | Reverse-DNS prefix of the profile identifiers, e.g. `com.example.autodiscover`. |
| `PROFILE_UUID` | a fixed UUID | Namespace for the per-address profile UUIDs. Changing it makes devices treat new downloads as different profiles. |
