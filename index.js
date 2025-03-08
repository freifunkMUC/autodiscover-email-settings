"use strict";

const path = require("path");
const Koa = require("koa");
const views = require("koa-views");
const bodyParser = require("koa-bodyparser");
const Router = require("koa-router");
const serve = require("koa-static"); // Middleware für statische Dateien
const settings = require("./settings.js");

const app = new Koa();
const router = new Router();

// Konfiguriere koa-views für .xml und .html Dateien
app.use(views(path.join(__dirname, "views"), {
  map: {
    xml: "nunjucks", // .xml Dateien mit nunjucks rendern
    html: "nunjucks", // .html Dateien mit nunjucks rendern
  },
  extension: "html", // Standard-Dateiendung
  options: {
    autoescape: true,
    noCache: process.env.NODE_ENV === "development",
    locals: settings,
  },
}));

// Middleware für statische Dateien (z. B. favicon.ico)
app.use(serve(path.join(__dirname, "public")));

// Helper function to find a child node by name
function findChild(name, children, def = null) {
  for (let child of children) {
    if (child.name === name) {
      return child;
    }
  }
  return def;
}

// Microsoft Outlook / Apple Mail
router.get("/autodiscover/autodiscover.xml", async (ctx) => {
  ctx.set("Content-Type", "application/xml");

  const request = ctx.request.body && ctx.request.body.root ?
    findChild("Request", ctx.request.body.root.children) :
    null;
  const schema = request !== null ?
    findChild("AcceptableResponseSchema", request.children) :
    null;
  const xmlns = schema !== null ?
    schema.content :
    "http://schemas.microsoft.com/exchange/autodiscover/responseschema/2006";

  let email = request !== null ?
    findChild("EMailAddress", request.children) :
    null;

  let username;
  let domain;
  if (email === null || email.content === null) {
    email = "";
    username = "";
    domain = settings.domain;
  } else if (email.content.includes("@")) {
    email = email.content;
    username = email.split("@")[0];
    domain = email.split("@")[1];
  } else {
    username = email.content;
    domain = settings.domain;
    email = username + "@" + domain;
  }

  const imapenc = settings.imap.socket === "STARTTLS" ? "TLS" : settings.imap.socket;
  const popenc = settings.pop.socket === "STARTTLS" ? "TLS" : settings.pop.socket;
  const smtpenc = settings.smtp.socket === "STARTTLS" ? "TLS" : settings.smtp.socket;

  const imapssl = settings.imap.socket === "SSL" ? "on" : "off";
  const popssl = settings.pop.socket === "SSL" ? "on" : "off";
  const smtpssl = settings.smtp.socket === "SSL" ? "on" : "off";

  await ctx.render("autodiscover", {
    schema: xmlns,
    email,
    username,
    domain,
    imapenc,
    popenc,
    smtpenc,
    imapssl,
    popssl,
    smtpssl,
  });
});

// Thunderbird
router.get("/mail/config-v1.1.xml", async (ctx) => {
  ctx.set("Content-Type", "application/xml");
  await ctx.render("autoconfig");
});

// iOS / Apple Mail
router.get("/email.mobileconfig", async (ctx) => {
  let email = ctx.request.query.email;

  if (!email) {
    ctx.status = 400;
    return;
  }

  let username;
  let domain;
  if (email.includes("@")) {
    username = email.split("@")[0];
    domain = email.split("@")[1];
  } else {
    username = email;
    domain = settings.domain;
    email = username + "@" + domain;
  }

  const filename = `${domain}.mobileconfig`;

  const imapssl = settings.imap.socket === "SSL" || settings.imap.socket === "STARTTLS" ? "true" : "false";
  const popssl = settings.pop.socket === "SSL" || settings.pop.socket === "STARTTLS" ? "true" : "false";
  const smtpssl = settings.smtp.socket === "SSL" || settings.smtp.socket === "STARTTLS" ? "true" : "false";
  const ldapssl = settings.ldap.socket === "SSL" || settings.ldap.port === "636" ? "true" : "false";

  ctx.set("Content-Type", "application/x-apple-aspen-config; charset=utf-8");
  ctx.set("Content-Disposition", `attachment; filename="${filename}"`);

  await ctx.render("mobileconfig", {
    email,
    username,
    domain,
    imapssl,
    popssl,
    smtpssl,
    ldapssl,
  });
});

// Generic support page
router.get("/", async (ctx) => {
  await ctx.render("index.html", {
    info: {
      name: "Your Company Name", // Beispielwert
    },
    domain: settings.domain, // Domain aus settings.js
    imap: settings.imap, // IMAP-Einstellungen aus settings.js
    pop: settings.pop, // POP-Einstellungen aus settings.js
    smtp: settings.smtp, // SMTP-Einstellungen aus settings.js
    ldap: settings.ldap, // LDAP-Einstellungen aus settings.js
    mobile: {
      identifier: true, // Beispielwert, falls mobileconfig aktiviert ist
    },
  });
});

// Middleware to fix content type
app.use(async (ctx, next) => {
  let type = ctx.request.headers["content-type"];

  if (type && type.indexOf("text/xml") === 0) {
    let newType = type.replace("text/xml", "application/xml");
    ctx.request.headers["content-type"] = newType;
  }

  await next();
});

// Middleware
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

// Start the server
app.listen(process.env.PORT || 8000, () => {
  console.log(`Server is running on port ${process.env.PORT || 8000}`);
});