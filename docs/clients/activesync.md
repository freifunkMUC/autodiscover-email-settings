# ActiveSync

ActiveSync clients, such as the mail apps of Android phones and iOS's *Exchange* account type, also find their server through Autodiscover: they post to the same `/autodiscover/autodiscover.xml`, asking for the `mobilesync/responseschema/2006` format.

This service does not provide ActiveSync. If you run a server that does, such as Z-Push, SOGo or grommunio, set its endpoint:

```sh
MOBILESYNC_URL=https://sync.example.com/Microsoft-Server-ActiveSync
```

and ActiveSync clients are told:

```xml
<Action>
  <Settings>
    <Server>
      <Type>MobileSync</Type>
      <Url>https://sync.example.com/Microsoft-Server-ActiveSync</Url>
      <Name>https://sync.example.com/Microsoft-Server-ActiveSync</Name>
    </Server>
  </Settings>
</Action>
```

Without `MOBILESYNC_URL` they get the ActiveSync error response (status 2, "ActiveSync is not offered for this domain"), and the user can set up IMAP instead.

## New Outlook

New Outlook for Windows asks for ActiveSync over Autodiscover v2 and does not fall back to IMAP once it has an ActiveSync URL. So `MOBILESYNC_URL` alone does not offer it ActiveSync; that also takes `MOBILESYNC_AUTODISCOVER_JSON=true`. See [Outlook](outlook.md#activesync).

## Checking

The **Exchange ActiveSync** test of Microsoft's [Remote Connectivity Analyzer](https://testconnectivity.microsoft.com/) runs the Autodiscover request of an ActiveSync client, and then tries to log in with the result.
