"use strict";

const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "commonjs",
			globals: globals.node
		},
		rules: {
			curly: "error",
			eqeqeq: "error",
			"no-var": "error",
			"prefer-const": "error",
			strict: ["error", "global"]
		}
	},
	{
		files: ["**/*.mjs"],
		languageOptions: { sourceType: "module" }
	}
];
