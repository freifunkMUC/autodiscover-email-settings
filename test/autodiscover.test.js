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
