"use strict";

const path = require("path");
const Koa = require("koa");
const app = new Koa();
const views = require("@ladjs/koa-views");
const xmlBody = require("koa-xml-body");
const bodyParser = require("koa-bodyparser");
const Router = require("@koa/router");
const router = new Router();
const settings = require("./settings.js");

function findChild(name, children, def = null) {
	for (let child of children) {
		if (child.name === name) {
			return child;
		}
	}
	return def;
}

function extractEmailFromXml(raw) {
	if (!raw) return null;
	const m = raw.match(/<EMailAddress>([^<]+)<\/EMailAddress>/i);
	return m ? m[1] : null;
}

// Microsoft Outlook / Apple Mail
async function autodiscover(ctx) {
	ctx.set("Content-Type", "application/xml");

	// Try to use parsed body if available, otherwise fallback to raw XML extraction
	let email = null;
	if (ctx.request.body && typeof ctx.request.body === 'object') {
		const request = ctx.request.body.root && ctx.request.body.root.children ?
			findChild("Request", ctx.request.body.root.children) : null;
		const schema = request !== null ? findChild("AcceptableResponseSchema", request.children) : null;
		const xmlns = schema !== null ? schema.content : "http://schemas.microsoft.com/exchange/autodiscover/responseschema/2006";

		let emailNode = request !== null ? findChild("EMailAddress", request.children) : null;
		if (emailNode && emailNode.content) {
			email = emailNode.content;
		}

		ctx.state._xmlns = xmlns;
	}

	if (!email) {
		const raw = ctx.request.rawBody || (typeof ctx.request.body === 'string' ? ctx.request.body : null);
		email = extractEmailFromXml(raw);
	}

	let username;
	let domain;
	if (!email) {
		email = "";
		username = "";
		domain = settings.domain;
	} else if (email.indexOf("@") !== -1) {
		username = email.split("@")[0];
		domain = email.split("@")[1];
	} else {
		username = email;
		domain = settings.domain;
		email = `${username}@${domain}`;
	}

	const imapenc = settings.imap.socket === "STARTTLS" ? "TLS" : settings.imap.socket;
	const popenc = settings.pop.socket === "STARTTLS" ? "TLS" : settings.pop.socket;
	const smtpenc = settings.smtp.socket === "STARTTLS" ? "TLS" : settings.smtp.socket;

	const imapssl = settings.imap.socket === "SSL" ? "on" : "off";
	const popssl = settings.pop.socket === "SSL" ? "on" : "off";
	const smtpssl = settings.smtp.socket === "SSL" ? "on" : "off";

	await ctx.render('autodiscover.xml', {
		schema: ctx.state._xmlns || "http://schemas.microsoft.com/exchange/autodiscover/responseschema/2006",
		email,
		username,
		domain,
		imapenc,
		popenc,
		smtpenc,
		imapssl,
		popssl,
		smtpssl
	});
}

router.get("/autodiscover/autodiscover.xml", autodiscover);
router.post("/autodiscover/autodiscover.xml", autodiscover);
router.get("/Autodiscover/Autodiscover.xml", autodiscover);
router.post("/Autodiscover/Autodiscover.xml", autodiscover);


// Thunderbird
router.get("/mail/config-v1.1.xml", async (ctx) => {
	ctx.set("Content-Type", "application/xml");
	await ctx.render('autoconfig.xml');
});


// iOS / Apple Mail (/email.mobileconfig?email=username@domain.com or /email.mobileconfig?email=username)
router.get("/email.mobileconfig", async (ctx) => {
	let email = ctx.request.query.email;

	if (!email) {
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
		domain = settings.domain;
		email = `${username}@${domain}`;
	}

	const filename = `${domain}.mobileconfig`;

	const imapssl = settings.imap.socket === "SSL" || settings.imap.socket === "STARTTLS" ? "true" : "false";
	const popssl = settings.pop.socket === "SSL" || settings.pop.socket === "STARTTLS" ? "true" : "false";
	const smtpssl = settings.smtp.socket === "SSL" || settings.smtp.socket === "STARTTLS" ? "true" : "false";
	const ldapssl = settings.ldap.socket === "SSL" || settings.ldap.port === "636" ? "true" : "false";

	ctx.set("Content-Type", "application/x-apple-aspen-config; charset=utf-8");
	ctx.set("Content-Disposition", `attachment; filename="${filename}"`);

	await ctx.render('mobileconfig.xml', {
		email,
		username,
		domain,
		imapssl,
		popssl,
		smtpssl,
		ldapssl
	});
});


// Generic support page
router.get("/", async (ctx) => {
	await ctx.render('index.html');
});

router.get("/favicon.ico", async (ctx) => {
	await ctx.render('favicon.ico');
});

app.use(views(path.join(__dirname, 'views'), {
	map: { xml: 'nunjucks' }
}));

app.use(async (ctx, next) => {
	// Normalize text/xml to application/xml for downstream parsers
	const type = ctx.request.headers['content-type'];
	if (type && type.indexOf('text/xml') === 0) {
		ctx.request.headers['content-type'] = type.replace('text/xml', 'application/xml');
	}
	await next();
});

// parse XML bodies into ctx.request.body and keep raw body on ctx.request.rawBody
app.use(xmlBody({
	enableRaw: true,
	xmlOptions: { explicitArray: false, explicitChildren: true, preserveChildrenOrder: true, charsAsChildren: false }
}));

// parse urlencoded/json bodies
app.use(bodyParser());

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(process.env.PORT || 8000);
