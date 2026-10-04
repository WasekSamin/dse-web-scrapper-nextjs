// Run with `npm test` (Node's built-in runner; needs Node 22.18+ to load .ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as cheerio from "cheerio";
import { rowFields } from "./parseTable.ts";

/** Parse a #company table body and return rowFields() for each row. */
function rows(html: string) {
  const $ = cheerio.load(`<table id="company">${html}</table>`);
  return $("#company tr")
    .toArray()
    .map((tr) => rowFields($, tr));
}

test("Main board: two label/value pairs per row", () => {
  const [r] = rows(`
    <tr><th>Last Update</th><td>11:24 AM</td>
        <th>52 Weeks' Moving Range</th><td>236.60 - 302.90</td></tr>`);
  assert.equal(r.carry, "");
  assert.deepEqual(r.pairs, [
    { label: "Last Update", value: "11:24 AM" },
    { label: "52 Weeks' Moving Range", value: "236.60 - 302.90" },
  ]);
});

test("SME/ATB: a row-spanning label carries its second value into the next row", () => {
  const [first, second] = rows(`
    <tr><th rowspan="2">Change*</th><td>1.2</td>
        <th>Day's Value (mn)  </th><td>0.06</td></tr>
    <tr><td>
        4.40%</td><th>52 Weeks' Moving Range</th><td>27.20 - 54.00</td></tr>`);
  assert.deepEqual(first.pairs, [
    { label: "Change", value: "1.2", spansRows: true },
    { label: "Day's Value (mn)", value: "0.06" },
  ]);
  // Before rowFields, "52 Weeks' Moving Range" was read as a value and lost.
  assert.equal(second.carry, "4.40%");
  assert.deepEqual(second.pairs, [
    { label: "52 Weeks' Moving Range", value: "27.20 - 54.00" },
  ]);
});

test("a '-' placeholder in the carried cell is ignored", () => {
  const [r] = rows(`<tr><td>-</td><th>52 Weeks' Moving Range</th><td>9.50 - 15.20</td></tr>`);
  assert.equal(r.carry, "");
  assert.deepEqual(r.pairs, [{ label: "52 Weeks' Moving Range", value: "9.50 - 15.20" }]);
});

test("labels without a value, and rows of only labels, yield no pairs", () => {
  const [a, b] = rows(`
    <tr><th>Sector</th><td></td><th>Market Lot</th></tr>
    <tr><th colspan="4">Graph:</th></tr>`);
  assert.deepEqual(a.pairs, []);
  assert.deepEqual(b.pairs, []);
});

test("rows with no <th> fall back to pairing cells two at a time", () => {
  const [r] = rows(`<tr><td>Listing Year:</td><td>2022</td><td>Market Category</td><td>N</td></tr>`);
  assert.deepEqual(r.pairs, [
    { label: "Listing Year", value: "2022" },
    { label: "Market Category", value: "N" },
  ]);
});
