import assert from "node:assert/strict";
import { test } from "node:test";

import { pickProfileSex, toProfileSex } from "./profile-sex";

test("server profile sex wins over the local row", () => {
  assert.equal(pickProfileSex("female", "male"), "female");
  assert.equal(pickProfileSex("male", "female"), "male");
});

test("no local row (new device / reinstall): server sex still drives the art", () => {
  assert.equal(pickProfileSex("female", null), "female");
  assert.equal(pickProfileSex("female", undefined), "female");
});

test("offline / before /me: local row is used", () => {
  assert.equal(pickProfileSex(undefined, "female"), "female");
  assert.equal(pickProfileSex(null, "male"), "male");
});

test("known sex beats unspecified; nothing known → null (figure falls back)", () => {
  assert.equal(pickProfileSex("unspecified", "female"), "female");
  assert.equal(pickProfileSex("unspecified", null), "unspecified");
  assert.equal(pickProfileSex(null, null), null);
});

test("junk values are ignored", () => {
  assert.equal(toProfileSex("FEMALE"), null);
  assert.equal(toProfileSex(1), null);
  assert.equal(pickProfileSex("woman", "female"), "female");
});
