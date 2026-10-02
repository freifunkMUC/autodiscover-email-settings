"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const loadSettings = require("../settings.js");

test("socket types are normalised to the spelling clients match on", () => {
	const settings = loadSettings({ IMAP_SOCKET: "ssl", SMTP_SOCKET: "starttls", POP_SOCKET: "PLAIN" });

	assert.equal(settings.imap.socket, "SSL");
	assert.equal(settings.smtp.socket, "STARTTLS");
	assert.equal(settings.pop.socket, "plain");
});

test("an unknown socket type is refused at startup", () => {
	assert.throws(() => loadSettings({ SMTP_SOCKET: "TLS" }), /SMTP_SOCKET must be SSL, STARTTLS or plain, not "TLS"/);
});
