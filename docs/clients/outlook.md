# Outlook

Outlook uses Microsoft's Autodiscover protocol ([MS-OXDSCLI](https://learn.microsoft.com/en-us/openspecs/exchange_server_protocols/ms-oxdscli/78530279-d042-4eb0-a1f4-03b18143cd19)). It posts the address to the [Autodiscover URLs](../dns.md) and expects the IMAP, POP3 and SMTP settings in the `outlook/responseschema/2006a` format. This service answers that request with:

- every configured server, POP3 as `POP3`;
- the address the user entered as the login;
- `SPA` off: Secure Password Authentication means NTLM, which IMAP servers usually do not offer;
- for `STARTTLS` servers `SSL` on and `Encryption` `TLS`, for `SSL` servers `Encryption` `SSL`.

## Which Outlook asks how

**Outlook 2013 and older, and the classic account wizard** query the Autodiscover URLs themselves, from the user's computer.

**Outlook 2016 and later, and Microsoft 365** first send the address to a Microsoft cloud service ("AutoDetect"), which queries the Autodiscover URLs from Microsoft's servers and hands the result to Outlook. Consequences:

- the service must be reachable from the internet, with a publicly trusted certificate;
- AutoDetect caches what it found, including failures. A fix can take a while to show, especially if earlier attempts failed;
- if AutoDetect finds nothing, Outlook guesses host names such as `imap.example.com`.

### New Outlook and Microsoft's cloud setup

**New Outlook for Windows** goes through Microsoft's cloud as well, and asks the domain's Autodiscover v2 endpoint first:

```text
GET /autodiscover/autodiscover.json/v1.0/alice@example.com?Protocol=ActiveSync
GET /autodiscover/autodiscover.json/v1.0/alice@example.com?Protocol=AutodiscoverV1
```

This service answers `AutodiscoverV1` with the URL of its XML endpoint, and everything else with the `InvalidProtocol` error Exchange uses, so the setup continues with IMAP.

### ActiveSync

With `MOBILESYNC_AUTODISCOVER_JSON=true`, the service also answers `Protocol=ActiveSync` with `MOBILESYNC_URL`. New Outlook then uses ActiveSync and does not fall back to IMAP. If your ActiveSync server does not work with new Outlook, account setup fails with messages like "Your email provider can no longer connect to Outlook", while IMAP logins for the same user succeed. Only turn it on after trying it with a test account.

## Checking

Microsoft's [Remote Connectivity Analyzer](https://testconnectivity.microsoft.com/) queries Autodiscover the way Microsoft's cloud does. Use the **Outlook Autodiscover** test. The **Exchange ActiveSync** test asks for ActiveSync settings; without `MOBILESYNC_URL` it fails by design, reporting that ActiveSync is not offered.

The analyzer also reports problems around the service: a bare domain with a broken certificate, an SRV record pointing at the wrong host, or a TLS setup Microsoft's servers find too narrow. See [Troubleshooting](../troubleshooting.md).

To see the response yourself:

```sh
curl -s -X POST -H 'Content-Type: text/xml' --data '<Autodiscover xmlns="http://schemas.microsoft.com/exchange/autodiscover/outlook/requestschema/2006"><Request><EMailAddress>alice@example.com</EMailAddress><AcceptableResponseSchema>http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a</AcceptableResponseSchema></Request></Autodiscover>' \
  https://autodiscover.example.com/autodiscover/autodiscover.xml
```
