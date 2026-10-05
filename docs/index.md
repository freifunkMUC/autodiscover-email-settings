# Autodiscover Email Settings

Mail clients can set up an account from nothing but the address and the password, if the provider tells them where its servers are.
This service does that for your mail domains: it answers the configuration requests of Thunderbird, Outlook and ActiveSync clients, offers configuration profiles for iPhone, iPad and Mac, and shows a support page with the manual settings.

It does not touch your mail server. It only describes it, from a handful of environment variables.

![The support page](screenshots/support-page.png)

## What it answers

| Client | Request | Endpoint |
| --- | --- | --- |
| Thunderbird, and clients using the same format | [Autoconfig](clients/thunderbird.md) | `/mail/config-v1.1.xml`, `/.well-known/autoconfig/mail/config-v1.1.xml` |
| Outlook, and Thunderbird as a fallback | [Autodiscover](clients/outlook.md), XML | `/autodiscover/autodiscover.xml` |
| New Outlook for Windows, via Microsoft's cloud | [Autodiscover v2](clients/outlook.md#new-outlook-and-microsofts-cloud-setup), JSON | `/autodiscover/autodiscover.json` |
| iOS, iPadOS and macOS Mail | [Configuration profile](clients/apple.md) | `/email.mobileconfig?email=<address>` |
| ActiveSync clients | [Autodiscover, MobileSync schema](clients/activesync.md) | `/autodiscover/autodiscover.xml` |
| People | Support page with the manual settings | `/` |

## Quick start

1. Point `autoconfig.example.com` and `autodiscover.example.com` at the host that will run the service, see [DNS and certificates](dns.md).
2. Start the container with your servers, see [Docker Compose](deployment/docker-compose.md):

    ```sh
    docker run -d -p 8000:8000 \
      -e DOMAIN=example.com \
      -e IMAP_HOST=mail.example.com \
      -e SMTP_HOST=mail.example.com \
      -e POP_HOST= \
      ghcr.io/freifunkmuc/autodiscover-email-settings:latest
    ```

3. Put it behind a reverse proxy that terminates HTTPS for both names, see [Reverse proxy](deployment/reverse-proxy.md).
4. Check what clients get, see [Troubleshooting](troubleshooting.md).

Every setting is described in [Configuration](configuration.md).
