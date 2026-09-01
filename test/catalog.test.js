import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer } from './helpers.mjs';

test('REQ-CAT-1: lists every item with sku, name, price and stock', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items');
    assert.equal(status, 200);
    assert.equal(body.length, 3);
    assert.deepEqual(Object.keys(body[0]).sort(), ['name', 'price', 'sku', 'stock']);
  }));

test('REQ-CAT-2: fetches a single item by sku', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items/MUG-1');
    assert.equal(status, 200);
    assert.equal(body.name, 'Enamel Mug');
    assert.equal(body.price, 1250);
  }));

test('REQ-CAT-2: an unknown sku is a 404 with a reason', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items/NOPE-9');
    assert.equal(status, 404);
    assert.equal(body.reason, 'unknown_sku');
  }));

test('REQ-CAT-3: search narrows the list to the matching item', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?q=Mug');
    assert.equal(status, 200);
    assert.equal(body.length, 1);
    assert.equal(body[0].sku, 'MUG-1');
  }));

test('REQ-CAT-3: an empty query returns everything', () =>
  withServer(async ({ get }) => {
    const { body } = await get('/api/items?q=');
    assert.equal(body.length, 3);
  }));

test('REQ-CAT-4: only items at or under the ceiling are returned', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?max_price=1000');
    assert.equal(status, 200);
    assert.deepEqual(body.map((item) => item.sku).sort(), ['BOOK-1', 'PEN-1']);
  }));

test('REQ-CAT-4: an item priced exactly at the ceiling is included', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?max_price=800');
    assert.equal(status, 200);
    assert.ok(body.some((item) => item.sku === 'BOOK-1'));
  }));

test('REQ-CAT-4: a max_price under every item price returns 200 with an empty array', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?max_price=1');
    assert.equal(status, 200);
    assert.deepEqual(body, []);
  }));

test('REQ-CAT-4: an absent max_price returns every item, unaffected', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items');
    assert.equal(status, 200);
    assert.equal(body.length, 3);
  }));

test('REQ-CAT-4: max_price combined with q returns only items matching both', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?q=Pen&max_price=350');
    assert.equal(status, 200);
    assert.equal(body.length, 1);
    assert.equal(body[0].sku, 'PEN-1');

    const excluded = await get('/api/items?q=Mug&max_price=350');
    assert.deepEqual(excluded.body, []);
  }));

test('REQ-CAT-4: a non-numeric max_price is refused with 400', () =>
  withServer(async ({ get }) => {
    const abc = await get('/api/items?max_price=abc');
    assert.equal(abc.status, 400);
    assert.equal(abc.body.reason, 'invalid_max_price');

    const decimal = await get('/api/items?max_price=10.50');
    assert.equal(decimal.status, 400);
    assert.equal(decimal.body.reason, 'invalid_max_price');
  }));

test('REQ-CAT-4: a negative max_price is refused with 400', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?max_price=-5');
    assert.equal(status, 400);
    assert.equal(body.reason, 'invalid_max_price');
  }));

test('REQ-CAT-4: an empty max_price is refused with 400', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?max_price=');
    assert.equal(status, 400);
    assert.equal(body.reason, 'invalid_max_price');
  }));

test('REQ-CAT-4: a borderline numeric form is refused with 400', () =>
  withServer(async ({ get }) => {
    const signed = await get('/api/items?max_price=%2B10');
    assert.equal(signed.status, 400);
    assert.equal(signed.body.reason, 'invalid_max_price');

    const scientific = await get('/api/items?max_price=1e3');
    assert.equal(scientific.status, 400);
    assert.equal(scientific.body.reason, 'invalid_max_price');

    const whitespace = await get('/api/items?max_price=%2010');
    assert.equal(whitespace.status, 400);
    assert.equal(whitespace.body.reason, 'invalid_max_price');
  }));

test('REQ-CAT-4: a repeated max_price is refused with 400', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?max_price=100&max_price=200');
    assert.equal(status, 400);
    assert.equal(body.reason, 'invalid_max_price');
  }));
