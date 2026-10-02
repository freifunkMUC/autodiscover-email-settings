"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { request } = require("./helpers.js");

const ACTIVESYNC = {
	MOBILESYNC_URL: "https://sync.example.org/Microsoft-Server-ActiveSync",
	MOBILESYNC_AUTODISCOVER_JSON: "true"
};

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

test("autodiscover.json withholds ActiveSync unless MOBILESYNC_AUTODISCOVER_JSON is set", async () => {
	const res = await autodiscoverJson({ MOBILESYNC_URL: ACTIVESYNC.MOBILESYNC_URL }, "Protocol=ActiveSync");

	assert.equal(res.status, 400);
	assert.equal(res.body.ErrorCode, "InvalidProtocol");
});

test("autodiscover.json returns the ActiveSync URL once enabled", async () => {
	const res = await autodiscoverJson(ACTIVESYNC, "Protocol=ActiveSync");

	assert.equal(res.status, 200);
	assert.deepEqual(res.body, { Protocol: "ActiveSync", Url: ACTIVESYNC.MOBILESYNC_URL });
});
