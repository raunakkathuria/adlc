import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer } from './helpers.mjs';

test('REQ-ORD-1: an accepted order is created and takes units out of stock', () =>
  withServer(async ({ post, get, stock }) => {
    const before = await stock('MUG-1');

    const { status, body } = await post('/api/orders', { sku: 'MUG-1', qty: 2 });
    assert.equal(status, 201);
    assert.equal(body.sku, 'MUG-1');
    assert.equal(body.qty, 2);
    assert.equal(body.total, 2500);

    assert.equal(await stock('MUG-1'), before - 2);

    const { body: orders } = await get('/api/orders');
    assert.equal(orders.length, 1);
    assert.equal(orders[0].id, body.id);
  }));

test('REQ-ORD-2: an order beyond available stock is rejected', () =>
  withServer(async ({ post }) => {
    const { status, body } = await post('/api/orders', { sku: 'PEN-1', qty: 12 });
    assert.equal(status, 422);
    assert.equal(body.reason, 'insufficient_stock');
  }));

test('REQ-ORD-3: an order over the 20-unit cap is rejected', () =>
  withServer(async ({ post }) => {
    const { status, body } = await post('/api/orders', { sku: 'MUG-1', qty: 21 });
    assert.equal(status, 422);
    assert.equal(body.reason, 'over_limit');
  }));

test('REQ-ORD-3: exactly 20 units is allowed', () =>
  withServer(async ({ post }) => {
    const { status } = await post('/api/orders', { sku: 'MUG-1', qty: 20 });
    assert.equal(status, 201);
  }));

test('REQ-ORD-4: a rejected order leaves stock untouched', () =>
  withServer(async ({ post, get, stock }) => {
    const before = await stock('PEN-1');

    const { status } = await post('/api/orders', { sku: 'PEN-1', qty: 12 });
    assert.equal(status, 422);

    assert.equal(await stock('PEN-1'), before);
    const { body: orders } = await get('/api/orders');
    assert.equal(orders.length, 0);
  }));

test('REQ-ORD-5: 12 units take 10% off, rounded down', () =>
  withServer(async ({ post }) => {
    const { body } = await post('/api/orders', { sku: 'MUG-1', qty: 12 });
    assert.equal(body.total, 13500);
  }));

test('REQ-ORD-5: 9 units pay the gross total', () =>
  withServer(async ({ post }) => {
    const { body } = await post('/api/orders', { sku: 'MUG-1', qty: 9 });
    assert.equal(body.total, 11250);
  }));

test('REQ-ORD-6: an unknown sku is a 404', () =>
  withServer(async ({ post }) => {
    const { status, body } = await post('/api/orders', { sku: 'NOPE-9', qty: 1 });
    assert.equal(status, 404);
    assert.equal(body.reason, 'unknown_sku');
  }));

test('REQ-ORD-6: a non-positive or fractional qty is a 400', () =>
  withServer(async ({ post }) => {
    for (const qty of [0, -3, 1.5, undefined]) {
      const { status, body } = await post('/api/orders', { sku: 'MUG-1', qty });
      assert.equal(status, 400, `qty=${qty}`);
      assert.equal(body.reason, 'invalid_qty');
    }
  }));
