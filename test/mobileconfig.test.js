"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { request } = require("./helpers.js");

const PROFILE = {
	DOMAIN: "example.com",
	PROFILE_IDENTIFIER: "com.example.autodiscover",
	PROFILE_UUID: "92943D26-CAB3-4086-897D-DC6C0D8B1E86"
};

async function mobileconfig(env, email) {
	const res = await request(env, `/email.mobileconfig?email=${encodeURIComponent(email)}`);
	assert.equal(res.status, 200);
	return res.body;
}

// Values of every <key>name</key><string>value</string> pair in the plist
function strings(plist, key) {
	const pattern = new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`, "g");
	return [...plist.matchAll(pattern)].map((match) => match[1]);
}

test("mobileconfig gives each address its own profile identifiers", async () => {
	const alice = await mobileconfig(PROFILE, "alice@example.com");
	const bob = await mobileconfig(PROFILE, "bob@example.com");

	for (const key of ["PayloadIdentifier", "PayloadUUID"]) {
		const shared = strings(alice, key).filter((value) => strings(bob, key).includes(value));
		assert.deepEqual(shared, [], `${key} must differ between addresses`);
	}
});

test("mobileconfig keeps an address's identifiers stable across downloads", async () => {
	const first = await mobileconfig(PROFILE, "alice@example.com");
	const second = await mobileconfig(PROFILE, "Alice@Example.com");

	assert.deepEqual(strings(second, "PayloadUUID"), strings(first, "PayloadUUID"));
	assert.deepEqual(strings(second, "PayloadIdentifier"), strings(first, "PayloadIdentifier"));
});

test("mobileconfig produces complete identifiers from DOMAIN alone", async () => {
	const plist = await mobileconfig({ DOMAIN: "example.com" }, "alice@example.com");
	const identifiers = strings(plist, "PayloadIdentifier");

	assert.match(identifiers.at(-1), /^com\.example\.autodiscover\.[0-9A-F-]{36}$/);
	for (const uuid of strings(plist, "PayloadUUID")) {
		assert.match(uuid, /^[0-9A-F]{8}-[0-9A-F]{4}-8[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/);
	}
});
