"use strict";

const { once } = require("events");
const xml2js = require("xml2js");
const createApp = require("../index.js");
const loadSettings = require("../settings.js");

// Starts the app configured from `env`, sends a single request and shuts it down again.
async function request(env, path, init) {
	const server = createApp(loadSettings(env)).listen(0, "127.0.0.1");
	await once(server, "listening");
	try {
		const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, init);
		return { status: res.status, type: res.headers.get("content-type"), body: await res.text() };
	} finally {
		server.close();
	}
}

function parseXml(text) {
	return xml2js.parseStringPromise(text, { explicitArray: false });
}

module.exports = { request, parseXml };
