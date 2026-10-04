"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { request } = require("./helpers.js");

test("the support page loads its scripts and stylesheets from this service only", async () => {
	const page = (await request({}, "/")).body;
	const sources = [...page.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map((match) => match[1]);

	assert.ok(sources.includes("assets/bootstrap.min.css"));
	assert.deepEqual(sources.filter((source) => /^(?:https?:)?\/\//.test(source)), []);
});

test("assets serves the bundled Bootstrap files and nothing else", async () => {
	const css = await request({}, "/assets/bootstrap.min.css");
	assert.equal(css.status, 200);
	assert.match(css.type, /^text\/css/);

	assert.equal((await request({}, "/assets/constructor")).status, 404);
	assert.equal((await request({}, "/assets/..%2Fpackage.json")).status, 404);
});
