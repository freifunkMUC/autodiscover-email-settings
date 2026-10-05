# Troubleshooting

## What the service answers

Each response can be fetched with curl. Run these from outside your network, since Outlook's setup queries the service from Microsoft's servers.

Thunderbird:

```sh
curl -s 'https://autoconfig.example.com/mail/config-v1.1.xml?emailaddress=alice@example.com'
```

Outlook, expecting `<Response xmlns="http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a">` with your servers and `<LoginName>alice@example.com</LoginName>`:

```sh
curl -s -X POST -H 'Content-Type: text/xml' \
  --data '<Autodiscover><Request><EMailAddress>alice@example.com</EMailAddress></Request></Autodiscover>' \
  https://autodiscover.example.com/autodiscover/autodiscover.xml
```

New Outlook, expecting `{"Protocol":"AutodiscoverV1","Url":"https://autodiscover.example.com/autodiscover/autodiscover.xml"}`:

```sh
curl -s 'https://autodiscover.example.com/autodiscover/autodiscover.json/v1.0/alice@example.com?Protocol=AutodiscoverV1'
```

Apple:

```sh
curl -s 'https://autodiscover.example.com/email.mobileconfig?email=alice@example.com'
```

For Outlook, the **Outlook Autodiscover** test of Microsoft's [Remote Connectivity Analyzer](https://testconnectivity.microsoft.com/) shows every URL it tried and why each failed.

## Common problems

**The service does not start: `SMTP_SOCKET must be SSL, STARTTLS or plain`**
: The socket type is misspelled, often as `TLS`. Use `SSL` for implicit TLS (465, 993, 995) and `STARTTLS` for 587, 143 and 110. See [Configuration](configuration.md#mail-servers).

**Clients are offered a POP3 server you do not run**
: POP3 is announced by default. Set `POP_HOST=` (empty).

**Outlook gets HTML instead of XML, or a certificate error**
: Check every URL in [DNS and certificates](dns.md): the bare domain is asked first, and the `_autodiscover._tcp` SRV record must point at this service, not at the webmail.

**Outlook still uses old or no settings after a fix**
: Microsoft's cloud setup caches what it found, failures included. Try again later, or with another address of the same domain.

**The analyzer's Exchange ActiveSync test fails with "ActiveSync is not offered for this domain"**
: That is the expected answer without `MOBILESYNC_URL`. Use the Outlook Autodiscover test for IMAP.

**The analyzer warns about cipher suites**
: Microsoft's servers support a limited set of TLS cipher suites. Offering TLS 1.3 and the common ECDHE-AES-GCM suites on the reverse proxy avoids the warning.

**An iPhone shows two accounts after installing a new profile**
: The old profile is from before version 2.0, see [Apple devices](clients/apple.md#identifiers).

## Logs

The service logs one JSON line per request to standard output, with method, path, status, duration and a `requestId`:

```sh
docker compose logs -f autodiscover
```

A request that never shows up there did not reach the service: look at DNS and the reverse proxy.
