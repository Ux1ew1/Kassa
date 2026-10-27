import test from "node:test";
import assert from "node:assert/strict";
import { searchMenu } from "./search.js";

const items = ["Чай", "Американо", "Капучино", "Латте", "Латте 300 мл", "Раф солёная карамель"]
  .map((name, id) => ({ id, name }));
const names = (query) => searchMenu(items, query).map((item) => item.name);

test("finds misspelled prefixes, missing letters and transpositions", () => {
  for (const query of ["амнри", "амеркано", "амреикано", "американоо"]) {
    assert.equal(names(query)[0], "Американо", query);
  }
  assert.equal(names("капучинно")[0], "Капучино");
});

test("handles keyboard layout, case, punctuation and ё", () => {
  assert.equal(names("fvthbrfyj")[0], "Американо");
  assert.equal(names("  АМЕРИ  ")[0], "Американо");
  assert.equal(names("раф, соленая")[0], "Раф солёная карамель");
});

test("requires every query word and keeps numbers literal", () => {
  assert.deepEqual(names("лате 300"), ["Латте 300 мл"]);
  assert.deepEqual(names("латте 400"), []);
  assert.deepEqual(names("американо карамель"), []);
  assert.deepEqual(names("xyzxyz"), []);
  assert.deepEqual(names("чы"), []);
});

test("keeps empty search and tied results in menu order", () => {
  assert.equal(searchMenu(items, "  "), items);
  assert.deepEqual(names("латте"), ["Латте", "Латте 300 мл"]);
  assert.deepEqual(searchMenu([], "амнри"), []);
});
