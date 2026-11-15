import assert from "node:assert/strict";
import { test } from "node:test";
import { request } from "playwright-core";

const origin = new URL(process.env.FUELLOCK_TEST_URL ?? "http://127.0.0.1:3040")
  .origin;
const options = { maxRedirects: 0, failOnStatusCode: false };

// Follow exactly the expected hop, preserving the real HTTP cookie jar.
// A second redirect (including a loop) fails the terminal status assertion.
async function oneRedirect(client, method, path, status, destination) {
  const first = await client.fetch(path, { ...options, method });
  assert.equal(first.status(), status, method + " " + path);
  const location = new URL(first.headers().location, origin);
  assert.equal(location.origin, origin);
  assert.equal(
    decodeURIComponent(location.pathname + location.search),
    destination,
  );
  const final = await client.fetch(location.href, {
    ...options,
    method: method === "HEAD" ? "HEAD" : "GET",
  });
  assert.equal(
    final.status(),
    200,
    method + " " + path + " must terminate after one redirect",
  );
  assert.equal(final.headers().location, undefined);
}

test("guests can open public routes and assets without a redirect or a session", async (t) => {
  const client = await request.newContext({ baseURL: origin });
  t.after(() => client.dispose());
  for (const path of [
    "/",
    "/login",
    "/login?next=/goals",
    "/demo",
    "/welcome",
    "/api/demo",
    "/icon.svg",
    "/favicon.ico",
    "/images/fuel-tokens.webp",
  ]) {
    assert.equal((await client.get(path, options)).status(), 200, path);
  }
  const page = await (await client.get("/", options)).text();
  const asset = page.match(/(?:src|href)="(\/_next\/static\/[^"]+)"/)?.[1];
  assert.ok(asset, "Landing page links to compiled Next.js assets");
  assert.equal(
    (await client.get(asset.replaceAll("&amp;", "&"), options)).status(),
    200,
  );
  assert.equal((await client.get("/api/demo/login", options)).status(), 405);
  assert.equal((await client.get("/api/updates", options)).status(), 401);
  assert.equal((await client.storageState()).cookies.length, 0);
});

test("protected routes send guests and invalid sessions directly to login", async (t) => {
  const client = await request.newContext({ baseURL: origin });
  t.after(() => client.dispose());
  for (const path of [
    "/overview",
    "/protection",
    "/trips",
    "/wallet",
    "/goals",
    "/settings",
    "/partner",
    "/activity",
    "/reports",
    "/household",
  ]) {
    await oneRedirect(client, "GET", path, 307, "/login?next=" + path);
  }
  await oneRedirect(client, "HEAD", "/goals/", 307, "/login?next=/goals");
  assert.equal((await client.storageState()).cookies.length, 0);
  const invalid = await request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Cookie: "fuellock_session=invalid" },
  });
  t.after(() => invalid.dispose());
  await oneRedirect(invalid, "GET", "/overview", 307, "/login?next=/overview");
  assert.equal((await invalid.get("/login", options)).status(), 200);
});

test("demo POST establishes a session and returns directly to a workspace page", async (t) => {
  const client = await request.newContext({ baseURL: origin });
  t.after(() => client.dispose());
  await oneRedirect(client, "POST", "/api/demo/login", 303, "/overview");
  const session = (await client.storageState()).cookies.find(
    (c) => c.name === "fuellock_session",
  );
  assert.ok(session?.httpOnly);
  assert.equal(session.path, "/");
  assert.equal(session.sameSite, "Lax");
  assert.equal(session.secure, origin.startsWith("https://"));
  assert.equal((await client.get("/overview", options)).status(), 200);
  await oneRedirect(client, "GET", "/login", 307, "/overview");
  await oneRedirect(client, "GET", "/login?next=/goals", 307, "/goals");
  await oneRedirect(
    client,
    "POST",
    "/api/demo/login?next=/goals",
    303,
    "/goals",
  );
  for (const next of [
    "/login",
    "/demo",
    "//example.org",
    "https://example.org",
  ]) {
    await oneRedirect(
      client,
      "GET",
      "/login?next=" + encodeURIComponent(next),
      307,
      "/overview",
    );
  }
  assert.equal(
    (await client.storageState()).cookies.find((c) => c.name === session.name)
      ?.value,
    session.value,
  );
});
