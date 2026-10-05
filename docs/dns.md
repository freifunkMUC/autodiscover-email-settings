# DNS and certificates

Clients find the service by name, derived from the domain of the address the user enters. For `alice@example.com`:

| Name | Asked by |
| --- | --- |
| `https://autoconfig.example.com/mail/config-v1.1.xml` | Thunderbird |
| `https://example.com/.well-known/autoconfig/mail/config-v1.1.xml` | Thunderbird |
| `https://example.com/autodiscover/autodiscover.xml` | Outlook, Thunderbird |
| `https://autodiscover.example.com/autodiscover/autodiscover.xml` | Outlook, Thunderbird, ActiveSync clients |
| `_autodiscover._tcp.example.com` (SRV) | Outlook, Thunderbird |

## Records

```text
autoconfig            IN  CNAME  autodiscover-host.example.com.
autodiscover          IN  CNAME  autodiscover-host.example.com.
_autodiscover._tcp    IN  SRV    0 0 443 autodiscover.example.com.
```

`autodiscover-host.example.com` stands for the machine running the service; `A` and `AAAA` records work just as well.

The SRV record must point at this service. Pointing it at another web server, such as the webmail, gives Outlook an HTML page where it expects XML.

These records are not used by the service, but help clients that look up servers directly ([RFC 6186](https://www.rfc-editor.org/rfc/rfc6186)):

```text
_imaps._tcp           IN  SRV    0 0 993 mail.example.com.
_submission._tcp      IN  SRV    0 0 587 mail.example.com.
```

!!! note "No `mailconf` TXT record"
    Older guides, including earlier versions of this one, suggest a `mailconf=https://...` TXT record. It comes from a proposal that Thunderbird never implemented; publishing it has no effect.

## The bare domain

Outlook and Thunderbird first ask `https://example.com/autodiscover/autodiscover.xml`, on whatever serves your website. That server should either forward the path to this service or answer quickly with an error. A broken or invalid certificate there costs time, and Microsoft's cloud setup may remember the failure.

To serve Thunderbird's `.well-known` URL as well, forward `/.well-known/autoconfig/` from the website to this service, see [Reverse proxy](deployment/reverse-proxy.md).

## Certificates

The service has to be reachable over HTTPS with a certificate that is valid for both `autoconfig.example.com` and `autodiscover.example.com`. Let's Encrypt works. Self-signed certificates do not: clients refuse them, and Outlook's setup runs partly in Microsoft's cloud, which only trusts public certificate authorities.

## Several domains

One instance serves any number of mail domains that share the same mail servers. For each domain, add the records above and include its `autoconfig.` and `autodiscover.` names in the certificate. Logins are always the address the user entered; `DOMAIN` only provides the defaults.
