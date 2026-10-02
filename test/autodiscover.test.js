"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { request, parseXml } = require("./helpers.js");

const OUTLOOK_REQUEST = "http://schemas.microsoft.com/exchange/autodiscover/outlook/requestschema/2006";
const OUTLOOK_RESPONSE = "http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a";
const MOBILESYNC_REQUEST = "http://schemas.microsoft.com/exchange/autodiscover/mobilesync/requestschema/2006";
const MOBILESYNC_RESPONSE = "http://schemas.microsoft.com/exchange/autodiscover/mobilesync/responseschema/2006";

function requestBody(email, schema = OUTLOOK_RESPONSE, namespace = OUTLOOK_REQUEST) {
	return `<?xml version="1.0" encoding="utf-8"?>
<Autodiscover xmlns="${namespace}">
	<Request>
		<EMailAddress>${email}</EMailAddress>
		<AcceptableResponseSchema>${schema}</AcceptableResponseSchema>
	</Request>
</Autodiscover>`;
}

async function autodiscover(env, body) {
	const res = await request(env, "/autodiscover/autodiscover.xml", {
		method: "POST",
		headers: { "Content-Type": "text/xml; charset=utf-8" },
		body
	});
	assert.equal(res.status, 200);
	return (await parseXml(res.body)).Autodiscover.Response;
}

function protocols(response) {
	return [].concat(response.Account.Protocol);
}

test("autodiscover returns the requested address as LoginName, escaped exactly once", async () => {
	const response = await autodiscover({}, requestBody("a&amp;b@example.org"));

	for (const protocol of protocols(response)) {
		assert.equal(protocol.LoginName, "a&b@example.org");
	}
});

test("autodiscover reads the address from a request with namespace prefixes", async () => {
	const body = `<a:Autodiscover xmlns:a="${OUTLOOK_REQUEST}"><a:Request>
		<a:EMailAddress>alice@example.org</a:EMailAddress>
		<a:AcceptableResponseSchema>${OUTLOOK_RESPONSE}</a:AcceptableResponseSchema>
	</a:Request></a:Autodiscover>`;
	const response = await autodiscover({}, body);

	assert.equal(protocols(response)[0].LoginName, "alice@example.org");
});

test("autodiscover answers Outlook in the outlook/responseschema/2006a namespace", async () => {
	const response = await autodiscover({}, requestBody("alice@example.org"));

	assert.equal(response.$.xmlns, OUTLOOK_RESPONSE);
	assert.equal(response.Account.Action, "settings");
});

test("autodiscover answers a MobileSync request with the ActiveSync URL", async () => {
	// Whitespace around the schema as in the MS-ASCMD example request
	const body = requestBody("alice@example.org", `
		${MOBILESYNC_RESPONSE}
		`, MOBILESYNC_REQUEST);
	const response = await autodiscover({ MOBILESYNC_URL: "https://sync.example.org/Microsoft-Server-ActiveSync" }, body);

	assert.equal(response.$.xmlns, MOBILESYNC_RESPONSE);
	assert.equal(response.User.EMailAddress, "alice@example.org");
	assert.deepEqual(response.Action.Settings.Server, {
		Type: "MobileSync",
		Url: "https://sync.example.org/Microsoft-Server-ActiveSync",
		Name: "https://sync.example.org/Microsoft-Server-ActiveSync"
	});
});

test("autodiscover returns error 601 for a MobileSync request without MOBILESYNC_URL", async () => {
	const body = requestBody("alice@example.org", MOBILESYNC_RESPONSE, MOBILESYNC_REQUEST);
	const response = await autodiscover({}, body);

	assert.equal(response.Error.ErrorCode, "601");
	assert.equal(response.Account, undefined);
});

test("autodiscover sends SPA=off so clients use plain login instead of NTLM", async () => {
	const response = await autodiscover({}, requestBody("alice@example.org"));

	for (const protocol of protocols(response)) {
		assert.equal(protocol.SPA, "off");
	}
});

test("autodiscover names the protocols IMAP, POP3 and SMTP as MS-OXDSCLI defines them", async () => {
	const response = await autodiscover({}, requestBody("alice@example.org"));

	assert.deepEqual(protocols(response).map((p) => p.Type), ["IMAP", "POP3", "SMTP"]);
});

test("autodiscover keeps SSL=on for STARTTLS so clients reading only <SSL> do not fall back to plaintext", async () => {
	const response = await autodiscover({ SMTP_PORT: "587", SMTP_SOCKET: "STARTTLS" }, requestBody("alice@example.org"));
	const smtp = protocols(response).find((p) => p.Type === "SMTP");

	assert.equal(smtp.SSL, "on");
	assert.equal(smtp.Encryption, "TLS");
});

test("autodiscover announces a plain socket as Encryption=None", async () => {
	const response = await autodiscover({ IMAP_PORT: "143", IMAP_SOCKET: "plain" }, requestBody("alice@example.org"));
	const imap = protocols(response).find((p) => p.Type === "IMAP");

	assert.equal(imap.SSL, "off");
	assert.equal(imap.Encryption, "None");
});

test("autodiscover does not ask clients to log in with a Windows domain", async () => {
	const response = await autodiscover({}, requestBody("alice@example.org"));

	for (const protocol of protocols(response)) {
		assert.equal(protocol.DomainRequired, "off");
		assert.equal(protocol.DomainName, undefined);
	}
});
