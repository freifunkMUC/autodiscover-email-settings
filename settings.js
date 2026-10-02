module.exports = (env) => ({
	info: {
 		name: env.COMPANY_NAME || env.DOMAIN || 'Example',
 		url: env.SUPPORT_URL || (env.DOMAIN ? `https://${env.DOMAIN}` : '')
	},
	domain: env.DOMAIN || 'example.com',

	// sensible defaults derived from domain when specific env vars are not provided;
	// an empty *_HOST disables that protocol
	imap: {
		host: env.IMAP_HOST ?? `imap.${env.DOMAIN || 'example.com'}`,
		port: env.IMAP_PORT || '993',
		socket: env.IMAP_SOCKET || 'SSL'
	},
	pop: {
		host: env.POP_HOST ?? `pop.${env.DOMAIN || 'example.com'}`,
		port: env.POP_PORT || '995',
		socket: env.POP_SOCKET || 'SSL'
	},
	smtp: {
		host: env.SMTP_HOST ?? `smtp.${env.DOMAIN || 'example.com'}`,
		port: env.SMTP_PORT || '587',
		socket: env.SMTP_SOCKET || 'STARTTLS'
	},
	mobilesync: {
		url: env.MOBILESYNC_URL,
		name: env.MOBILESYNC_NAME
	},
	ldap: {
		host: env.LDAP_HOST,
		port: env.LDAP_PORT,
		socket: env.LDAP_SOCKET,
		base: env.LDAP_BASE,
		userfield: env.LDAP_USER_FIELD,
		usersbase: env.LDAP_USER_BASE,
		searchfilter: env.LDAP_SEARCH
	},
	mobile: {
		identifier: env.PROFILE_IDENTIFIER,
		uuid: env.PROFILE_UUID,
		mail: {
			uuid: env.MAIL_UUID,
		},
		ldap: {
			uuid: env.LDAP_UUID,
		}
	}
});
