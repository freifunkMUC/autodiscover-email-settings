"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { request, parseXml } = require("./helpers.js");

async function autoconfig(env) {
	const res = await request(env, "/mail/config-v1.1.xml?emailaddress=alice%40example.com");
	assert.equal(res.status, 200);
	return (await parseXml(res.body)).clientConfig.emailProvider;
}

test("autoconfig derives server hostnames from DOMAIN", async () => {
	const provider = await autoconfig({ DOMAIN: "example.com" });

	assert.deepEqual(provider.incomingServer.map((s) => [s.$.type, s.hostname, s.port, s.socketType]), [
		["imap", "imap.example.com", "993", "SSL"],
		["pop3", "pop.example.com", "995", "SSL"]
	]);
	assert.equal(provider.outgoingServer.hostname, "smtp.example.com");
	assert.equal(provider.outgoingServer.port, "587");
	assert.equal(provider.outgoingServer.socketType, "STARTTLS");
});
