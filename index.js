"use strict";

const path = require("path");
const crypto = require("crypto");
const Koa = require("koa");
const views = require("@ladjs/koa-views");
const { getRawBody } = require("raw-body");
const xml2js = require("xml2js");
const bodyParser = require("koa-bodyparser");
const Router = require("@koa/router");
const router = new Router();
const loadSettings = require("./settings.js");
const send = require('koa-send');

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const LOG_ENABLED = LOG_LEVEL !== 'silent' && LOG_LEVEL !== 'none';

function log(level, event, details = {}) {
	if (!LOG_ENABLED) {
		return;
	}

	const payload = Object.assign({
		timestamp: new Date().toISOString(),
		level,
		event
	}, details);

	const output = JSON.stringify(payload);
	if (level === 'error') {
		console.error(output);
	} else {
		console.log(output);
	}
}

function buildRequestId() {
	if (typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return crypto.randomBytes(16).toString('hex');
}

const XML_OPTIONS = {
	explicitArray: false,
	explicitChildren: true,
	preserveChildrenOrder: true,
	charsAsChildren: false
};

// Parses XML request bodies into ctx.request.body and keeps the raw text on
// ctx.request.rawBody. This replaces koa-xml-body, a thin wrapper around the same two
// libraries that declares a peer dependency on koa@^2 and so breaks a plain `npm ci`
// on koa 3.
async function xmlBody(ctx, next) {
	if (ctx.request.body !== undefined ||
		!ctx.is('text/xml', 'xml') ||
		!/^(POST|PUT|PATCH)$/i.test(ctx.method)) {
		return next();
	}

	const text = await getRawBody(ctx.req, {
		limit: '1mb',
		encoding: ctx.request.charset || 'utf8',
		length: ctx.request.headers['content-length']
	});

	let parsed;
	try {
		parsed = await xml2js.parseStringPromise(text, XML_OPTIONS);
	} catch (err) {
		ctx.throw(400, `invalid XML body: ${err.message}`);
	}

	ctx.request.body = parsed;
	ctx.request.rawBody = text;

	return next();
}

function localName(element) {
	return typeof element["#name"] === "string" ? element["#name"].replace(/^.*:/, "") : null;
}

function childElement(element, name) {
	return (element.$$ || []).find((child) => localName(child) === name);
}

// Walks the xml2js tree by local element names, so namespace prefixes do not matter,
// and returns the trimmed text of the element at the end of `path`.
function readXmlText(body, path) {
	const root = body && typeof body === "object" ? Object.values(body)[0] : null;
	let element = root && localName(root) === path[0] ? root : null;
	for (const name of path.slice(1)) {
		element = element && childElement(element, name);
	}
	return element && typeof element._ === "string" ? element._.trim() || null : null;
}

const OUTLOOK_RESPONSE_SCHEMA = "http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a";
const MOBILESYNC_RESPONSE_SCHEMA = "http://schemas.microsoft.com/exchange/autodiscover/mobilesync/responseschema/2006";

function parseAutodiscoverAddress(email, defaultDomain) {
	if (!email) {
		return { email: "", username: "", domain: defaultDomain };
	}
	if (email.indexOf("@") !== -1) {
		return { email, username: email.split("@")[0], domain: email.split("@")[1] };
	}
	return { email: `${email}@${defaultDomain}`, username: email, domain: defaultDomain };
}

async function renderOutlookSettings(ctx, address) {
	const encryption = (socket) => ({ SSL: "SSL", STARTTLS: "TLS" })[socket] || "None";
	const imapenc = encryption(ctx.settings.imap.socket);
	const popenc = encryption(ctx.settings.pop.socket);
	const smtpenc = encryption(ctx.settings.smtp.socket);

	// <Encryption> tells implicit TLS from STARTTLS. Clients that ignore it, Thunderbird
	// among them, read <SSL>off</SSL> as plaintext, so SSL is on for either.
	const tls = (socket) => (socket === "SSL" || socket === "STARTTLS" ? "on" : "off");
	const imapssl = tls(ctx.settings.imap.socket);
	const popssl = tls(ctx.settings.pop.socket);
	const smtpssl = tls(ctx.settings.smtp.socket);

	await ctx.render('autodiscover.xml', Object.assign({}, ctx.settings, address, {
		imapenc,
		popenc,
		smtpenc,
		imapssl,
		popssl,
		smtpssl
	}));
}

// Microsoft Outlook / Apple Mail
async function autodiscover(ctx) {
	const body = ctx.request.body;
	const address = parseAutodiscoverAddress(
		readXmlText(body, ["Autodiscover", "Request", "EMailAddress"]), ctx.settings.domain);
	// Clients must name the schema they can parse; requests without one are treated as Outlook.
	const schema = (readXmlText(body, ["Autodiscover", "Request", "AcceptableResponseSchema"]) ||
		OUTLOOK_RESPONSE_SCHEMA).toLowerCase();

	// A GET from a browser (e.g. the support page link) still gets a preview.
	if (ctx.method === "POST" && !address.email) {
		await ctx.render('autodiscover-error.xml', { code: 600, message: "Invalid Request" });
	} else if (schema === OUTLOOK_RESPONSE_SCHEMA.toLowerCase()) {
		await renderOutlookSettings(ctx, address);
	} else if (schema === MOBILESYNC_RESPONSE_SCHEMA.toLowerCase()) {
		await ctx.render('autodiscover-mobilesync.xml', Object.assign({}, ctx.settings, address));
	} else {
		await ctx.render('autodiscover-error.xml', { code: 601, message: "Provider is not available" });
	}
	ctx.type = "application/xml";
}

router.get("/autodiscover/autodiscover.xml", autodiscover);
router.post("/autodiscover/autodiscover.xml", autodiscover);
router.get("/Autodiscover/Autodiscover.xml", autodiscover);
router.post("/Autodiscover/Autodiscover.xml", autodiscover);


// Autodiscover v2, queried by Microsoft's cloud account setup for new Outlook
// (GET /autodiscover/autodiscover.json[/v1.0/<address>]?Protocol=...).
async function autodiscoverJson(ctx) {
	const protocol = String(ctx.query.Protocol || ctx.query.protocol || "").toLowerCase();
	// Opt-in: once new Outlook gets an ActiveSync URL it does not fall back to IMAP,
	// so only announce it where the ActiveSync server works with new Outlook.
	const activeSync = ctx.settings.mobilesync.autodiscoverJson && ctx.settings.mobilesync.url;

	if (protocol === "autodiscoverv1") {
		ctx.body = { Protocol: "AutodiscoverV1", Url: `https://${ctx.host}/autodiscover/autodiscover.xml` };
	} else if (protocol === "activesync" && activeSync) {
		ctx.body = { Protocol: "ActiveSync", Url: activeSync };
	} else {
		ctx.status = 400;
		ctx.body = {
			ErrorCode: "InvalidProtocol",
			ErrorMessage: "The given protocol value is invalid. Supported values are AutodiscoverV1" +
				(activeSync ? ", ActiveSync." : ".")
		};
	}
}

router.get("/autodiscover/autodiscover.json", autodiscoverJson);
router.get("/autodiscover/autodiscover.json/v1.0/:address", autodiscoverJson);


// Thunderbird
async function autoconfig(ctx) {
	await ctx.render('autoconfig.xml', ctx.settings);
	ctx.type = "application/xml";
}

router.get("/mail/config-v1.1.xml", autoconfig);
// Thunderbird also tries https://<domain>/.well-known/..., if the domain's web server forwards it
router.get("/.well-known/autoconfig/mail/config-v1.1.xml", autoconfig);


// Name-based UUID (RFC 9562, version 8 with SHA-256 as in appendix B.2):
// the same name always yields the same UUID.
function nameBasedUuid(name, namespace) {
	const hash = crypto.createHash("sha256")
		.update(Buffer.from(namespace.replace(/-/g, ""), "hex"))
		.update(name)
		.digest();
	hash[6] = (hash[6] & 0x0f) | 0x80;
	hash[8] = (hash[8] & 0x3f) | 0x80;
	const hex = hash.toString("hex", 0, 16).toUpperCase();
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// A device keeps one profile per PayloadIdentifier, so each address gets its own,
// derived from the address to stay the same across downloads.
function profileIdentifiers(mobile, email) {
	const name = email.toLowerCase();
	const uuid = nameBasedUuid(name, mobile.uuid);
	return {
		identifier: `${mobile.identifier}.${uuid}`,
		uuid,
		mail: { uuid: nameBasedUuid(`mail:${name}`, mobile.uuid) },
		ldap: { uuid: nameBasedUuid(`ldap:${name}`, mobile.uuid) }
	};
}

// Apple requires an outgoing server in a mail payload, so it needs SMTP besides IMAP or POP.
function hasMailPayload(settings) {
	return Boolean((settings.imap.host || settings.pop.host) && settings.smtp.host);
}

function hasProfile(settings) {
	return hasMailPayload(settings) || Boolean(settings.ldap.host);
}

// iOS / Apple Mail (/email.mobileconfig?email=username@domain.com or /email.mobileconfig?email=username)
router.get("/email.mobileconfig", async (ctx) => {
	if (!hasProfile(ctx.settings)) {
		ctx.status = 404;
		return;
	}

	let email = ctx.request.query.email;

	// Ensure email is a single string value, not an array, to avoid type confusion issues
	if (Array.isArray(email)) {
		email = email[0] || "";
	}

	if (!email || typeof email !== "string") {
		ctx.status = 400;
		return;
	}

	let username;
	let domain;
	if (email.indexOf("@") !== -1) {
		username = email.split("@")[0];
		domain = email.split("@")[1];
	} else {
		username = email;
		domain = ctx.settings.domain;
		email = `${username}@${domain}`;
	}

	const safeDomain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
	const filename = `${safeDomain}.mobileconfig`;

	const imapssl = ctx.settings.imap.socket === "SSL" || ctx.settings.imap.socket === "STARTTLS" ? "true" : "false";
	const popssl = ctx.settings.pop.socket === "SSL" || ctx.settings.pop.socket === "STARTTLS" ? "true" : "false";
	const smtpssl = ctx.settings.smtp.socket === "SSL" || ctx.settings.smtp.socket === "STARTTLS" ? "true" : "false";
	const ldapssl = ctx.settings.ldap.socket === "SSL" || ctx.settings.ldap.port === "636" ? "true" : "false";

	ctx.set("Content-Type", "application/x-apple-aspen-config; charset=utf-8");
	ctx.set("Content-Disposition", `attachment; filename="${filename}"`);

	await ctx.render('mobileconfig.xml', Object.assign({}, ctx.settings, {
		email,
		username,
		domain,
		imapssl,
		popssl,
		smtpssl,
		ldapssl,
		mailPayload: hasMailPayload(ctx.settings),
		mobile: profileIdentifiers(ctx.settings.mobile, email)
	}));
	ctx.type = "application/x-apple-aspen-config";
});


// Generic support page
router.get("/", async (ctx) => {
	await ctx.render('index.html', Object.assign({}, ctx.settings, { profile: hasProfile(ctx.settings) }));
});

// Bootstrap for the support page, served from node_modules so that visitors do not
// load it from a third-party CDN
const BOOTSTRAP_DIST = path.join(path.dirname(require.resolve("bootstrap/package.json")), "dist");
const ASSETS = {
	"bootstrap.min.css": "css/bootstrap.min.css",
	"bootstrap.min.js": "js/bootstrap.min.js"
};

router.get("/assets/:file", async (ctx) => {
	if (Object.hasOwn(ASSETS, ctx.params.file)) {
		await send(ctx, ASSETS[ctx.params.file], { root: BOOTSTRAP_DIST, maxage: 24 * 60 * 60 * 1000 });
	}
});

router.get("/favicon.ico", async (ctx) => {
	// Serve static favicon from views directory
	ctx.type = 'image/x-icon';
	await send(ctx, 'favicon.ico', { root: path.join(__dirname, 'views') });
});

function createApp(settings) {
	const app = new Koa();
	app.context.settings = settings;

	app.use(views(path.join(__dirname, 'views'), {
		map: { xml: 'nunjucks', html: 'nunjucks' }
	}));

	app.use(async (ctx, next) => {
		const incomingRequestId = ctx.get('x-request-id');
		const requestId = incomingRequestId || buildRequestId();
		ctx.state.requestId = requestId;
		ctx.set('X-Request-Id', requestId);
		await next();
	});

	app.use(async (ctx, next) => {
		try {
			await next();
		} catch (err) {
			ctx.status = err.status || 500;
			if (!ctx.body) {
				ctx.body = 'Internal Server Error';
			}

			log('error', 'request_error', {
				requestId: ctx.state.requestId,
				method: ctx.method,
				path: ctx.path,
				status: ctx.status,
				message: err.message
			});

			ctx.app.emit('error', err, ctx);
		}
	});

	app.use(async (ctx, next) => {
		const start = Date.now();
		await next();

		log('info', 'request', {
			requestId: ctx.state.requestId,
			method: ctx.method,
			path: ctx.path,
			status: ctx.status,
			durationMs: Date.now() - start,
			ip: ctx.ip
		});
	});

	app.use(async (ctx, next) => {
		// Normalize text/xml to application/xml for downstream parsers
		const type = ctx.request.headers['content-type'];
		if (type && type.indexOf('text/xml') === 0) {
			ctx.request.headers['content-type'] = type.replace('text/xml', 'application/xml');
		}
		await next();
	});

	// parse XML bodies into ctx.request.body and keep raw body on ctx.request.rawBody
	app.use(xmlBody);

	// parse urlencoded/json bodies
	app.use(bodyParser());

	app.use(router.routes());
	app.use(router.allowedMethods());

	app.on('error', (err, ctx) => {
		log('error', 'app_error', {
			requestId: ctx && ctx.state ? ctx.state.requestId : undefined,
			message: err.message
		});
	});

	return app;
}

if (require.main === module) {
	const port = process.env.PORT || 8000;
	createApp(loadSettings(process.env)).listen(port);
	log('info', 'server_started', { port });
}

module.exports = createApp;
