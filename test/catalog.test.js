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

// The seeded catalogue: MUG-1 at 1250, BOOK-1 at 800, PEN-1 at 350, in that order.
const skus = (body) => body.map((item) => item.sku);

test('REQ-CAT-1: with no query and no price cap, every item is returned', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items');
    assert.equal(status, 200);
    assert.deepEqual(skus(body), ['MUG-1', 'BOOK-1', 'PEN-1']);
  }));

test('REQ-CAT-4: a cap returns only the items priced at or below it', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?max_price=1000');
    assert.equal(status, 200);
    assert.deepEqual(skus(body), ['BOOK-1', 'PEN-1']);
  }));

test('REQ-CAT-4: the cap is inclusive — a cap of 800 keeps the item priced 800', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?max_price=800');
    assert.equal(status, 200);
    assert.deepEqual(skus(body), ['BOOK-1', 'PEN-1']);
  }));

test('REQ-CAT-4: a cap above the most expensive item returns every item', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?max_price=2000');
    assert.equal(status, 200);
    assert.deepEqual(skus(body), ['MUG-1', 'BOOK-1', 'PEN-1']);
  }));

test('REQ-CAT-4: a cap below the cheapest item returns an empty array', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?max_price=100');
    assert.equal(status, 200);
    assert.deepEqual(body, []);
  }));

test('REQ-CAT-4: an empty cap returns every item', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?max_price=');
    assert.equal(status, 200);
    assert.deepEqual(skus(body), ['MUG-1', 'BOOK-1', 'PEN-1']);
  }));

test('REQ-CAT-4: a cap of zero returns only the items priced zero — empty today', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?max_price=0');
    assert.equal(status, 200);
    assert.deepEqual(body, []);
  }));

test('REQ-CAT-4: a negative cap is rejected', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?max_price=-1');
    assert.equal(status, 400);
    assert.equal(body.reason, 'invalid_max_price');
  }));

test('REQ-CAT-4: a cap that is not a whole number is rejected', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?max_price=9.99');
    assert.equal(status, 400);
    assert.equal(body.reason, 'invalid_max_price');
  }));

test('REQ-CAT-4: a cap that is not a number is rejected', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?max_price=cheap');
    assert.equal(status, 400);
    assert.equal(body.reason, 'invalid_max_price');
  }));

test('REQ-CAT-4: a refused cap is refused before anything is narrowed', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?q=Mug&max_price=-1');
    assert.equal(status, 400);
    assert.equal(body.reason, 'invalid_max_price');
  }));

test('REQ-CAT-4: a cap has no effect on fetch by sku', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items/MUG-1?max_price=100');
    assert.equal(status, 200);
    assert.equal(body.sku, 'MUG-1');
    assert.equal(body.price, 1250);
  }));

test('REQ-CAT-4: an item priced above the cap can still be ordered (REQ-ORD-1)', () =>
  withServer(async ({ get, post }) => {
    const { body: listed } = await get('/api/items?max_price=1000');
    assert.ok(!skus(listed).includes('MUG-1'));

    const { status, body } = await post('/api/orders', { sku: 'MUG-1', qty: 1 });
    assert.equal(status, 201);
    assert.equal(body.total, 1250);
  }));

test('REQ-CAT-3: a query and a cap both apply', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?q=Notebook&max_price=1000');
    assert.equal(status, 200);
    assert.deepEqual(skus(body), ['BOOK-1']);
  }));

test('REQ-CAT-3: an item matching the query but above the cap is not returned', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?q=Mug&max_price=1000');
    assert.equal(status, 200);
    assert.deepEqual(body, []);
  }));

test('REQ-CAT-3: a query matching nothing and a cap excluding everything is an empty list, not a rejection', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?q=zzz&max_price=1');
    assert.equal(status, 200);
    assert.deepEqual(body, []);
  }));
