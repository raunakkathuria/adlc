import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { withServer } from './helpers.mjs';

const LIVE_REGION = /role="status"|aria-live="(polite|assertive)"/;

/**
 * Load the real page served for `/`, and run its actual inline script against a minimal
 * DOM stub wired to the live server, so REQ-ORD-7 is exercised the way a browser would run
 * it rather than by pattern-matching the script's source.
 */
async function loadClientPage(base) {
  const html = await (await fetch(base + '/')).text();
  const noteMarkup = html.match(/<div id="note"[^>]*>/)?.[0] ?? '';
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        value: '',
        innerHTML: '',
        dataset: {},
        addEventListener() {},
        querySelectorAll() { return []; },
      });
    }
    return elements.get(id);
  }

  const sandbox = {
    document: { getElementById: element },
    fetch: (path, options) => fetch(base + path, options),
  };
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);
  // the script's own bottom-of-file calls to these are fire-and-forget; wait for a full
  // round trip so no request is still in flight once the test's server shuts down.
  await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

  return {
    noteMarkup,
    order: async (sku, qty) => {
      element(`qty-${sku}`).value = String(qty);
      await sandbox.order(sku);
    },
    noteHtml: () => element('note').innerHTML,
  };
}

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

test('REQ-ORD-7: the order-outcome region is an ARIA live region from the first page load', () =>
  withServer(async ({ base }) => {
    const html = await (await fetch(base + '/')).text();
    const note = html.match(/<div id="note"[^>]*>/);
    assert.ok(note, 'expected a #note element in the markup served for /');
    assert.match(note[0], LIVE_REGION);
  }));

test("REQ-ORD-7: a successful order's confirmation is written into the live region", () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    assert.match(page.noteMarkup, LIVE_REGION);

    await page.order('MUG-1', 2);
    assert.match(page.noteHtml(), /Order #\d+ placed/);
  }));

test("REQ-ORD-7: a rejected order's reason is written into the live region", () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    assert.match(page.noteMarkup, LIVE_REGION);

    await page.order('MUG-1', 21);
    assert.match(page.noteHtml(), /Rejected/);
  }));

test("REQ-ORD-7: a second order's outcome replaces the live region's content rather than appending to it", () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    assert.match(page.noteMarkup, LIVE_REGION);

    await page.order('MUG-1', 21);
    assert.match(page.noteHtml(), /Rejected/);

    await page.order('MUG-1', 2);
    const html = page.noteHtml();
    assert.match(html, /Order #\d+ placed/);
    assert.doesNotMatch(html, /Rejected/);
    assert.equal((html.match(/<p/g) ?? []).length, 1);
  }));
