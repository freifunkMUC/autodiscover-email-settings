# Thunderbird

Thunderbird looks for the settings of `alice@example.com` in this order:

1. `https://autoconfig.example.com/mail/config-v1.1.xml?emailaddress=alice@example.com`, and `https://example.com/.well-known/autoconfig/mail/config-v1.1.xml`;
2. Mozilla's database of large providers (ISPDB);
3. the same, for the domain of the domain's MX server;
4. Exchange Autodiscover, `https://autodiscover.example.com/autodiscover/autodiscover.xml` and the other [Autodiscover URLs](../dns.md);
5. guessing common host names.

This service answers 1 and 4. The [autoconfig format](https://datatracker.ietf.org/doc/draft-ietf-mailmaint-autoconfig/) is the one other clients, such as K-9 Mail/Thunderbird for Android, use as well.

## What it gets

Every configured server, in the order IMAP, POP3, SMTP, with:

- the host, port and socket type (`SSL`, `STARTTLS` or `plain`) from the [configuration](../configuration.md#mail-servers);
- `%EMAILADDRESS%` as the user name, which Thunderbird replaces with the address the user entered;
- `password-cleartext` as the authentication: the password is sent inside the TLS connection, as SASL PLAIN or LOGIN.

The Autodiscover response, which Thunderbird uses when autoconfig is missing, leads to the same settings: plain password login, STARTTLS on port 587, all configured servers. Before version 2.0 Thunderbird ended up with NTLM authentication and unencrypted SMTP from it, and without POP3.

## Checking

```sh
curl -s 'https://autoconfig.example.com/mail/config-v1.1.xml?emailaddress=alice@example.com'
```

The account setup tells whether the settings came from the email provider (autoconfig) or from Exchange Autodiscover. Thunderbird's error console (Ctrl+Shift+J) logs each URL it tried.
