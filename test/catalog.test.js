import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { withServer } from './helpers.mjs';

const LIVE_REGION = /role="status"|aria-live="(polite|assertive)"/;

/**
 * Load the real page served for `/` and run its actual inline script against a minimal
 * DOM stub, then drive it through search and orders — so the catalogue requirements are
 * exercised the way a browser would render them, not by pattern-matching the script's source.
 *
 * `items`, when given, makes the stubbed `fetch` answer `/api/items` with fabricated data
 * instead of the seeded catalog — the only way to get a malicious item name in front of the
 * renderer, since the real API has no way to create or rename an item.
 */
async function loadClientPage(base, { items } = {}) {
  const html = await (await fetch(base + '/')).text();
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      let html = '';
      let writes = 0;
      elements.set(id, {
        value: '',
        dataset: {},
        get innerHTML() { return html; },
        set innerHTML(v) { html = v; writes += 1; },
        get writeCount() { return writes; },
        addEventListener() {},
        querySelectorAll() { return []; },
        focus() {},
      });
    }
    return elements.get(id);
  }

  const sandbox = {
    document: { getElementById: element },
    fetch: (path, options) => {
      if (items && /^\/api\/items(\?|$)/.test(path)) {
        return Promise.resolve({ status: 200, json: async () => items });
      }
      return fetch(base + path, options);
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);
  await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

  return {
    itemsHtml: () => element('items').innerHTML,
    itemListHtml: () => element('item-list').innerHTML,
    itemsWriteCount: () => element('items').writeCount,
    search: async (query) => {
      element('q').value = query;
      await sandbox.loadItems();
    },
    typeRapidly: (queries) => Promise.all(queries.map((query) => {
      element('q').value = query;
      return sandbox.loadItems();
    })),
    order: async (sku, qty) => {
      element(`qty-${sku}`).value = String(qty);
      await sandbox.order(sku);
    },
    noteHtml: () => element('note').innerHTML,
  };
}

async function emptyStateHtml(base, query) {
  const page = await loadClientPage(base);
  await page.search(query);
  return page.itemsHtml();
}

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

test('REQ-CAT-3: a lowercase query matches a name in a different case', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?q=mug');
    assert.equal(status, 200);
    assert.equal(body.length, 1);
    assert.equal(body[0].sku, 'MUG-1');
  }));

test('REQ-CAT-3: a lowercase query matches a SKU in a different case', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?q=book-1');
    assert.equal(status, 200);
    assert.equal(body.length, 1);
    assert.equal(body[0].sku, 'BOOK-1');
  }));

test('REQ-CAT-3: a query that matches neither sku nor name returns 200 with an empty array', () =>
  withServer(async ({ get }) => {
    const { status, body } = await get('/api/items?q=no-such-thing');
    assert.equal(status, 200);
    assert.deepEqual(body, []);
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

test('REQ-CAT-6: an ordinary query still displays correctly in the empty-state message', () =>
  withServer(async ({ base }) => {
    const html = await emptyStateHtml(base, 'no-such-item');
    assert.match(html, /Nothing matches “no-such-item”\./);
  }));

test('REQ-CAT-6: markup in the query is shown as text, not parsed', () =>
  withServer(async ({ base }) => {
    const html = await emptyStateHtml(base, '<b>bold</b> & "quoted"');
    assert.doesNotMatch(html, /<b>bold<\/b>/);
    assert.match(html, /&lt;b&gt;bold&lt;\/b&gt; &amp; &quot;quoted&quot;/);
  }));

test('REQ-CAT-6: a script-injection query does not run and is shown as inert text', () =>
  withServer(async ({ base }) => {
    const html = await emptyStateHtml(base, '<img src=x onerror=alert(1)>');
    assert.doesNotMatch(html, /<img[^>]*onerror/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  }));

test('REQ-CAT-5: the search field has an accessible name independent of its placeholder', () =>
  withServer(async ({ base }) => {
    const res = await fetch(base + '/');
    const html = await res.text();

    const input = html.match(/<input[^>]*\bid="q"[^>]*>/)[0];
    assert.match(input, /placeholder="/, 'the placeholder hint is still present');

    const hasAriaLabel = /\baria-label="[^"]+"/.test(input);
    const hasLabel = new RegExp('<label[^>]*\\bfor="q"[^>]*>\\s*\\S').test(html);
    assert.ok(
      hasAriaLabel || hasLabel,
      'search field needs an aria-label or an associated <label for="q"> for its accessible name'
    );
  }));

test('REQ-CAT-7: the items region is an ARIA live region from the first page load', () =>
  withServer(async ({ base }) => {
    const html = await (await fetch(base + '/')).text();
    const items = html.match(/<div id="items"[^>]*>/);
    assert.ok(items, 'expected a #items element in the markup served for /');
    assert.match(items[0], LIVE_REGION);
  }));

test('REQ-CAT-7: a search that matches nothing writes the empty-state message into the live region', () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.search('no-such-item');
    assert.match(page.itemsHtml(), /Nothing matches/);
  }));

test('REQ-CAT-7: a search that returns to matching results announces the new count', () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.search('no-such-item');
    assert.match(page.itemsHtml(), /Nothing matches/);

    await page.search('mug');
    assert.match(page.itemsHtml(), /1 item matches/);
  }));

test("REQ-CAT-7: an order that changes a displayed item's stock updates the live region independently of the #note outcome announcement", () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.order('MUG-1', 2);

    assert.match(page.itemsHtml(), /3 items match/, 'the items live region should still report the (unchanged) match count');
    assert.match(page.noteHtml(), /Order #\d+ placed/, 'the order-outcome live region announces separately');
  }));

test("REQ-CAT-7: the live region states how many items match, not each item's name, sku, price, or stock", () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    const html = page.itemsHtml();

    assert.match(html, /3 items match/);
    for (const detail of ['Enamel Mug', 'MUG-1', '12.50', '47 in stock', 'Pocket Notebook', 'Fineliner Pen']) {
      assert.ok(!html.includes(detail), `items live region should not recite "${detail}"`);
    }
  }));

test('REQ-CAT-7: the full item list remains reachable even though its details are excluded from the live region', () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);

    assert.ok(!page.itemsHtml().includes('Enamel Mug'), 'the live region should not carry item details');
    assert.match(page.itemListHtml(), /Enamel Mug/);
    assert.match(page.itemListHtml(), /MUG-1/);
  }));

test('REQ-CAT-7: typing several characters in quick succession produces one announcement, not one per keystroke', () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    const before = page.itemsWriteCount();

    await page.typeRapidly(['m', 'mu', 'mug']);

    assert.equal(page.itemsWriteCount(), before + 1, 'expected exactly one announcement for the whole burst');
    assert.match(page.itemsHtml(), /1 item matches/);
  }));

test('REQ-CAT-8: multiple items are exposed as a semantic list', () =>
  withServer(async ({ base }) => {
    const html = await (await fetch(base + '/')).text();
    const listTag = html.match(/<ul id="item-list"[^>]*>/);
    assert.ok(listTag, 'expected a list container for catalogue items');
    assert.match(listTag[0], /role="list"/);

    const page = await loadClientPage(base);
    const items = page.itemListHtml().match(/role="listitem"/g) ?? [];
    assert.equal(items.length, 3, 'expected assistive technology to see 3 list items');
  }));

test('REQ-CAT-8: the list structure survives a narrowing search', () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.search('mug');
    const items = page.itemListHtml().match(/role="listitem"/g) ?? [];
    assert.equal(items.length, 1);
  }));

test('REQ-CAT-8: the empty state renders no list items', () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.search('no-such-item');
    assert.doesNotMatch(page.itemListHtml(), /role="listitem"/);
  }));

test("REQ-CAT-8: list semantics are declared explicitly, so they survive the page's own list-style styling", () =>
  withServer(async ({ base }) => {
    const html = await (await fetch(base + '/')).text();
    const listTag = html.match(/<ul id="item-list"[^>]*>/)[0];
    assert.match(listTag, /role="list"/, 'role="list" must be explicit, since list-style: none can strip the native list role');
    assert.match(html, /#item-list\s*\{[^}]*list-style:\s*none/, 'expected the page to actually apply list-style: none to this list');

    const page = await loadClientPage(base);
    const items = page.itemListHtml().match(/role="listitem"/g) ?? [];
    assert.equal(items.length, 3);
  }));

test('REQ-CAT-9: an ordinary item name still displays correctly at all three sites', () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    const html = page.itemListHtml();
    assert.match(html, /Enamel Mug/);
    assert.match(html, /aria-label="Quantity of Enamel Mug"/);
    assert.match(html, /aria-label="Order Enamel Mug"/);
  }));

test('REQ-CAT-9: markup in an item name is shown as text, not parsed, at all three interpolation sites', () =>
  withServer(async ({ base }) => {
    const items = [{ sku: 'X-1', name: '<b>bold</b> & "quoted"', price: 100, stock: 5 }];
    const page = await loadClientPage(base, { items });
    const html = page.itemListHtml();

    assert.doesNotMatch(html, /<b>bold<\/b>/, 'name should not be parsed as markup');
    const escaped = '&lt;b&gt;bold&lt;/b&gt; &amp; &quot;quoted&quot;';
    const occurrences = html.split(escaped).length - 1;
    assert.equal(occurrences, 3, 'expected the escaped name at the visible name, quantity label, and Order button label');
  }));

test('REQ-CAT-9: a script-injection-shaped item name does not run at any of the three sites', () =>
  withServer(async ({ base }) => {
    const items = [{ sku: 'X-1', name: '<img src=x onerror=alert(1)>', price: 100, stock: 5 }];
    const page = await loadClientPage(base, { items });
    const html = page.itemListHtml();

    assert.doesNotMatch(html, /<img[^>]*onerror/);
    const occurrences = (html.match(/&lt;img src=x onerror=alert\(1\)&gt;/g) ?? []).length;
    assert.equal(occurrences, 3);
  }));
