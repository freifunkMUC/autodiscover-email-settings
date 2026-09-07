// Environment parsing.
//
// Three states are distinguished, not two:
//   variable unset      -> use the default (the fork's intent: DOMAIN alone is enough);
//   variable set to ""  -> the protocol is DISABLED, its block is left out of the response;
//   variable set        -> use the given value.
//
// Without the empty-string case an unwanted protocol could not be turned off at all:
// `||` treats "" as falsy and falls back to the default, so POP_HOST="" still advertised
// pop.<domain> — a server that need not exist. Clients were then offered a host that
// fails to resolve or refuses the connection.
const envOr = (value, fallback) =>
	value === undefined ? fallback : (value === '' ? undefined : value);

const domain = envOr(process.env.DOMAIN, 'example.com');

module.exports = {
	info: {
		name: envOr(process.env.COMPANY_NAME, domain || 'Example'),
		url: envOr(process.env.SUPPORT_URL, domain ? `https://${domain}` : '')
	},
	domain: domain,

	// sensible defaults derived from domain when specific env vars are not provided
	imap: {
		host: envOr(process.env.IMAP_HOST, `imap.${domain || 'example.com'}`),
		port: envOr(process.env.IMAP_PORT, '993'),
		socket: envOr(process.env.IMAP_SOCKET, 'SSL')
	},
	pop: {
		host: envOr(process.env.POP_HOST, `pop.${domain || 'example.com'}`),
		port: envOr(process.env.POP_PORT, '995'),
		socket: envOr(process.env.POP_SOCKET, 'SSL')
	},
	smtp: {
		host: envOr(process.env.SMTP_HOST, `smtp.${domain || 'example.com'}`),
		port: envOr(process.env.SMTP_PORT, '587'),
		socket: envOr(process.env.SMTP_SOCKET, 'STARTTLS')
	},
	mobilesync: {
		url: process.env.MOBILESYNC_URL,
		name: process.env.MOBILESYNC_NAME
	},
	ldap: {
		host: process.env.LDAP_HOST,
		port: process.env.LDAP_PORT,
		socket: process.env.LDAP_SOCKET,
		base: process.env.LDAP_BASE,
		userfield: process.env.LDAP_USER_FIELD,
		usersbase: process.env.LDAP_USER_BASE,
		searchfilter: process.env.LDAP_SEARCH
	},
	mobile: {
		identifier: process.env.PROFILE_IDENTIFIER,
		uuid: process.env.PROFILE_UUID,
		mail: {
			uuid: process.env.MAIL_UUID,
		},
		ldap: {
			uuid: process.env.LDAP_UUID,
		}
	}
};
