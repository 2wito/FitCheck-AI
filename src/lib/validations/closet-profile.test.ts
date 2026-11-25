import assert from "node:assert/strict";
import { test } from "node:test";

import { createClosetSchema, profileSchema, slugify } from "./closet-profile.ts";

const base = { closetName: "Dana's Closet", name: "Dana", visibility: "PUBLIC" };

test("slugify makes a readable address from a Latin name", () => {
  assert.equal(slugify("TWITO'S CLOSET"), "twitos-closet");
  assert.equal(slugify("  Café & Co.  "), "cafe-co");
});

test("slugify falls back for names with no Latin letters", () => {
  assert.equal(slugify("הארון של דנה"), "closet");
  assert.equal(slugify("🔥🔥"), "closet");
});

test("a public closet needs no email or password", () => {
  const parsed = createClosetSchema.parse({ ...base, email: "", password: "" });
  assert.equal(parsed.email, null);
  assert.equal(parsed.password, null);
});

test("a private closet must have both email and password", () => {
  const priv = { ...base, visibility: "PRIVATE" };
  assert.equal(createClosetSchema.safeParse(priv).success, false);
  assert.equal(createClosetSchema.safeParse({ ...priv, email: "a@b.co" }).success, false);
  assert.equal(
    createClosetSchema.safeParse({ ...priv, email: "a@b.co", password: "12345678" }).success,
    true,
  );
});

test("half a login on a public closet is rejected", () => {
  assert.equal(createClosetSchema.safeParse({ ...base, email: "a@b.co" }).success, false);
  assert.equal(createClosetSchema.safeParse({ ...base, password: "12345678" }).success, false);
});

test("emails are normalized to lower case", () => {
  const parsed = createClosetSchema.parse({ ...base, email: " Dana@B.CO ", password: "12345678" });
  assert.equal(parsed.email, "dana@b.co");
});

test("age is optional and limited to 13-120", () => {
  assert.equal(profileSchema.parse({ ...base, age: "" }).age, null);
  assert.equal(profileSchema.parse({ ...base, age: "13" }).age, 13);
  for (const age of ["12", "121", "20.5", "abc"]) {
    assert.equal(profileSchema.safeParse({ ...base, age }).success, false, age);
  }
});

test("names are trimmed and bounded; unknown gender and visibility are rejected", () => {
  assert.equal(profileSchema.parse({ ...base, closetName: "  My Closet " }).closetName, "My Closet");
  assert.equal(profileSchema.safeParse({ ...base, closetName: " a " }).success, false);
  assert.equal(profileSchema.safeParse({ ...base, closetName: "x".repeat(41) }).success, false);
  assert.equal(profileSchema.safeParse({ ...base, name: " " }).success, false);
  assert.equal(profileSchema.safeParse({ ...base, gender: "X" }).success, false);
  assert.equal(profileSchema.safeParse({ ...base, visibility: "X" }).success, false);
  assert.equal(profileSchema.parse({ ...base, gender: "" }).gender, null);
});
