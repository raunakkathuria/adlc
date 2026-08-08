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
