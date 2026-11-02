import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const Base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
async function Login(Body, Origin = Base, Type = "application/json") {
  return fetch(`${Base}/api/auth/login`, { method: "POST", headers: {
    ...(Origin === null ? {} : { Origin }), "Content-Type": Type,
  }, body: Body });
}
const Username = `missing${randomBytes(5).toString("hex")}`;
const Credentials = JSON.stringify({ username: Username, password: randomBytes(16).toString("hex") });
assert.equal((await Login(Credentials, "https://untrusted.example")).status, 403);
assert.equal((await Login(Credentials, null)).status, 403);
assert.equal((await Login(Credentials, Base, "text/plain")).status, 415);
for (const Body of ["{", "null", "[]", '{"username":{},"password":[]}']) {
  assert.equal((await Login(Body)).status, 400);
}
assert.equal((await Login(JSON.stringify({ username: Username, password: "x".repeat(20000) }))).status, 413);
assert.equal((await Login(JSON.stringify({ username: Username, password: "界".repeat(25) }))).status, 400);
for (let Index = 0; Index < 10; Index++) assert.equal((await Login(Credentials)).status, 401);
const Limited = await Login(Credentials);
assert.equal(Limited.status, 429);
assert.equal(Limited.headers.get("retry-after"), "900");
const Session = await fetch(`${Base}/api/auth/session`);
assert.equal(Session.headers.get("x-content-type-options"), "nosniff");
assert.equal(Session.headers.get("x-frame-options"), "DENY");
assert.match(Session.headers.get("cache-control"), /no-store/);
assert.equal(Session.headers.get("x-powered-by"), null);
console.log("PASS: origin/CSRF checks, JSON types and size, bcrypt byte limit, shared login throttle, security/no-store headers");
