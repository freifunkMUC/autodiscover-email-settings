# Apple devices

Mail on iPhone, iPad and Mac does not look up IMAP settings by itself; it only knows the settings of large providers. For everyone else this service offers a configuration profile: a file that sets up the account, and optionally an LDAP address book, when it is installed.

## Installing a profile

1. Open the support page, `https://autodiscover.example.com/`, on the device.
2. Enter the address under *Apple Configuration Profile* and download the profile.
3. Install it: on iOS and iPadOS in *Settings*, where *Profile Downloaded* appears at the top; on macOS in *System Settings → General → Device Management*.
4. Enter the password when asked.

The profile can also be downloaded directly: `https://autodiscover.example.com/email.mobileconfig?email=alice@example.com`.

The profile is not signed, so devices show it as *Not Verified*. That only means its origin cannot be checked cryptographically; it does not hold a password.

## What it contains

- an IMAP account (POP3 if IMAP is turned off) with SMTP for sending, using the address as user name and requiring encryption for `SSL` and `STARTTLS` servers;
- an LDAP address book, if `LDAP_HOST` is set, binding as `LDAP_USER_FIELD=<user>,LDAP_USER_BASE`.

Apple requires an outgoing server for a mail account. Without SMTP the profile contains only the address book, and without either, no profile is offered.

## Identifiers

A device keeps one profile per identifier. Each address gets its own, derived from the address, `PROFILE_IDENTIFIER` and `PROFILE_UUID` (see [Configuration](../configuration.md#apple-configuration-profiles)):

- profiles for several addresses can be installed side by side;
- downloading the profile for the same address again replaces the installed one;
- changing `PROFILE_IDENTIFIER` or `PROFILE_UUID` makes new downloads separate profiles.

Profiles from before version 2.0 all shared one identifier. Remove such a profile before installing a new one, or both accounts appear.
