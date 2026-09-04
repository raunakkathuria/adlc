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
async function loadClientPage(base, { fetch: fetchImpl } = {}) {
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
    fetch: fetchImpl ?? ((path, options) => fetch(base + path, options)),
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
    itemsHtml: () => element('items').innerHTML,
    search: async (query) => {
      element('q').value = query;
      await sandbox.loadItems();
    },
  };
}

function orderButtonMarkup(itemsHtml, sku) {
  return itemsHtml.match(new RegExp(`<button[^>]*data-sku="${sku}"[^>]*>[\\s\\S]*?</button>`))?.[0];
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

test("REQ-ORD-8: an item's Order button has an accessible name that includes the item's name", () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    const button = orderButtonMarkup(page.itemsHtml(), 'MUG-1');
    assert.ok(button, 'expected an Order button for MUG-1');
    assert.match(button, /aria-label="[^"]*Enamel Mug[^"]*"/);
  }));

test("REQ-ORD-8: each item's Order button has a distinct accessible name from the others", () =>
  withServer(async ({ base, get }) => {
    const page = await loadClientPage(base);
    const { body: items } = await get('/api/items');
    assert.ok(items.length > 1, 'need at least two items to check distinctness');

    const names = items.map((item) => {
      const button = orderButtonMarkup(page.itemsHtml(), item.sku);
      assert.ok(button, `expected an Order button for ${item.sku}`);
      return button.match(/aria-label="([^"]*)"/)?.[1];
    });

    for (const [i, item] of items.entries()) {
      assert.ok(names[i]?.includes(item.name), `Order button for ${item.sku} should name "${item.name}"`);
    }
    assert.equal(new Set(names).size, items.length, 'no two items should share an Order button accessible name');
  }));

test("REQ-ORD-8: the Order button's visible label is unaffected", () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    const button = orderButtonMarkup(page.itemsHtml(), 'MUG-1');
    assert.match(button, />Order<\/button>$/);
  }));

test('REQ-ORD-8: a remaining item keeps its accessible name after a search narrows the list', () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.search('mug');
    const button = orderButtonMarkup(page.itemsHtml(), 'MUG-1');
    assert.ok(button, 'expected MUG-1 to remain after searching "mug"');
    assert.match(button, /aria-label="[^"]*Enamel Mug[^"]*"/);
  }));

// REQ-CAT-9 and REQ-ORD-9 — both found by the quality station while it was working on the search
// announcement (issues #69 and #70), and both pre-existing rather than introduced by that change.

test('REQ-CAT-9: the matching items are a list, not a run of unrelated blocks', async () => {
  await withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    const html = page.itemsHtml();
    assert.match(html, /<ul[^>]*>/, 'the items belong in a list element');
    assert.match(html, /<li[^>]*class="card"/, 'one list item per catalogue item');
    assert.doesNotMatch(
      html,
      /<div[^>]*class="card"/,
      'a card is a list item now; a bare div gives assistive technology nothing to count',
    );
  });
});

test('REQ-CAT-9: styling away the markers does not cost the list semantics', async () => {
  await withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    const list = page.itemsHtml().match(/<ul[^>]*>/)[0];
    assert.match(
      list,
      /role="list"/,
      'list-style:none drops list semantics in at least one browser and screen-reader pairing, ' +
        'so the role has to be restored explicitly',
    );
  });
});

test('REQ-CAT-9: the empty state is a message, not an empty list', async () => {
  await withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.search('nothing-matches-this-query');
    const html = page.itemsHtml();
    assert.doesNotMatch(html, /<li/, 'an empty list would be announced as a list of zero items');
    assert.match(html, /Nothing matches/, 'the empty-state message stands in its place');
  });
});

test('REQ-ORD-9: a reason the page has wording for keeps that wording', async () => {
  await withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.order('MUG-1', 999); // more than stock — a reason the page names
    assert.match(page.noteHtml(), /not enough in stock/i);
  });
});

test('REQ-ORD-9: a reason the page cannot name does not leak its identifier', async () => {
  await withServer(async ({ base }) => {
    const page = await loadClientPage(base, {
      // Stand in for a server the page is older than: a reason code it has no wording for.
      fetch: (path, options) =>
        path === '/api/orders' && options?.method === 'POST'
          ? Promise.resolve({ status: 422, json: async () => ({ reason: 'quota_exhausted_today' }) })
          : fetch(base + path, options),
    });
    await page.order('MUG-1', 1);
    const shown = page.noteHtml();
    assert.doesNotMatch(shown, /quota_exhausted_today/, 'an internal code is not a sentence');
    assert.doesNotMatch(shown, /_/, 'nor is anything underscore-joined');
    assert.match(shown, /Rejected/, 'it still reads as a refusal');
  });
});

test('REQ-ORD-9: a rejection carrying no reason at all still reads as English', async () => {
  await withServer(async ({ base }) => {
    const page = await loadClientPage(base, {
      fetch: (path, options) =>
        path === '/api/orders' && options?.method === 'POST'
          ? Promise.resolve({ status: 422, json: async () => ({}) })
          : fetch(base + path, options),
    });
    await page.order('MUG-1', 1);
    const shown = page.noteHtml();
    assert.doesNotMatch(shown, /undefined|null/, 'the shopper should never be shown a missing value');
    assert.match(shown, /Rejected/);
  });
});
