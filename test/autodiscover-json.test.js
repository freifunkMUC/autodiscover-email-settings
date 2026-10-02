"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { request } = require("./helpers.js");

async function autodiscoverJson(env, query) {
	const res = await request(env, `/autodiscover/autodiscover.json/v1.0/alice@example.org?${query}`);
	return { status: res.status, body: JSON.parse(res.body) };
}

test("autodiscover.json points AutodiscoverV1 at the XML endpoint on this host", async () => {
	const res = await autodiscoverJson({}, "Protocol=AutodiscoverV1");

	assert.equal(res.status, 200);
	assert.equal(res.body.Protocol, "AutodiscoverV1");
	assert.match(res.body.Url, /^https:\/\/[^/]+\/autodiscover\/autodiscover\.xml$/);
});

test("autodiscover.json answers other protocols with InvalidProtocol", async () => {
	const res = await autodiscoverJson({}, "Protocol=ActiveSync");

	assert.equal(res.status, 400);
	assert.equal(res.body.ErrorCode, "InvalidProtocol");
});
