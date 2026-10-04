---
name: Bug report
about: A mail client does not get the right settings, or the service misbehaves
title: ''
labels: bug

---

**What happens**
What the client or the service does, and what you expected instead.

**Mail client**
Client and version (e.g. Thunderbird 140, Outlook for Windows 2508, iOS 26 Mail), and how you set up the account.

**Request and response**
The URL that was queried and what the service answered, for example:

```
curl -s 'https://autoconfig.example.com/mail/config-v1.1.xml?emailaddress=alice@example.com'
curl -s -X POST -H 'Content-Type: text/xml' --data '<Autodiscover><Request><EMailAddress>alice@example.com</EMailAddress></Request></Autodiscover>' https://autodiscover.example.com/autodiscover/autodiscover.xml
```

For Outlook, the result of Microsoft's [Remote Connectivity Analyzer](https://testconnectivity.microsoft.com/) helps a lot.

**Setup**
- Image tag or commit:
- How it runs (Docker, Compose, systemd) and the reverse proxy in front of it:
- The environment variables you set (replace anything private):
