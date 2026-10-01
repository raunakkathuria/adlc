import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { withServer } from './helpers.mjs';

/**
 * Load the real page served for `/`, so tests run its actual inline script against a
 * minimal DOM stub rather than a re-implementation of it.
 */
async function loadPageScript(base) {
  const html = await (await fetch(base + '/')).text();
  return html.match(/<script>([\s\S]*?)<\/script>/)[1];
}

/**
 * A stub DOM element that records every `innerHTML` write, not just the last one, so a test
 * can see each render a script performs, not only where things ended up.
 */
function createElementStub() {
  let value = '';
  let innerHTML = '';
  const history = [];
  const listeners = {};
  const attrs = new Map();
  return {
    get value() { return value; },
    set value(v) { value = v; },
    get innerHTML() { return innerHTML; },
    set innerHTML(v) { innerHTML = v; history.push(v); },
    get history() { return history; },
    addEventListener(type, fn) { (listeners[type] ??= []).push(fn); },
    /** Dispatch an event the way the browser would; resolves when the handlers' work has settled. */
    fire(type) { return Promise.all((listeners[type] ?? []).map((fn) => fn())); },
    getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; },
    setAttribute(name, v) { attrs.set(name, String(v)); },
    removeAttribute(name) { attrs.delete(name); },
    querySelectorAll() { return []; },
  };
}

/** Run the page's inline script in a fresh sandbox, wired to a caller-chosen `fetch`. */
function createSandbox(script, fetchImpl) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, createElementStub());
    return elements.get(id);
  }

  const sandbox = {
    document: { getElementById: element },
    fetch: fetchImpl,
  };
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);

  return { sandbox, element };
}

/** A `fetch` that always talks to the real, running server — the sandbox's normal mode. */
function passThroughFetch(base) {
  return (path, options) => fetch(base + path, options);
}

/**
 * A `fetch` that answers every `/items` request with a fixed, caller-chosen result regardless
 * of the query — for exercising the client's own wording logic independent of what the real
 * catalog happens to hold or match. Everything else still talks to the real server.
 */
function fakeItemsFetch(base, items) {
  return (path, options) => {
    if (path.startsWith('/api/items?') || path === '/api/items') {
      return Promise.resolve({ status: 200, json: async () => items });
    }
    return fetch(base + path, options);
  };
}

/** A promise a test can resolve from the outside, to control when a stubbed request settles. */
function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

/**
 * Load the real page served for `/` and run its actual inline script against a minimal
 * DOM stub, then drive a search through it — so REQ-CAT-6 is exercised the way a browser
 * would render the empty-state message, not by pattern-matching the script's source.
 */
async function emptyStateHtml(base, query) {
  const script = await loadPageScript(base);
  const { sandbox, element } = createSandbox(script, passThroughFetch(base));
  await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

  element('q').value = query;
  await sandbox.loadItems();

  return element('items').innerHTML;
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

test('REQ-CAT-7: the page exposes a distinct, visually-hidden live-region summary, separate from the item cards', () =>
  withServer(async ({ base }) => {
    const res = await fetch(base + '/');
    const html = await res.text();

    const itemsTag = html.match(/<div[^>]*\bid="items"[^>]*>/)[0];
    assert.doesNotMatch(itemsTag, /role=|aria-live=/, 'the item cards area must not itself be a live region');

    const summaryTag = html.match(/<[a-z]+[^>]*\bid="summary"[^>]*>/)[0];
    assert.match(summaryTag, /role="status"|aria-live="(polite|assertive)"/, 'the summary needs a live-region role');
  }));

test('REQ-CAT-7: the automatic search on page load announces the full item count, including zero', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);

    const single = createSandbox(script, fakeItemsFetch(base, [{ sku: 'A', name: 'A', price: 1, stock: 1 }]));
    await Promise.all([single.sandbox.loadItems(), single.sandbox.loadOrders()]);
    assert.equal(single.element('summary').innerHTML, 'Showing 1 item.');

    const many = createSandbox(script, fakeItemsFetch(base, [
      { sku: 'A', name: 'A', price: 1, stock: 1 },
      { sku: 'B', name: 'B', price: 1, stock: 1 },
    ]));
    await Promise.all([many.sandbox.loadItems(), many.sandbox.loadOrders()]);
    assert.equal(many.element('summary').innerHTML, 'Showing 2 items.');

    const none = createSandbox(script, fakeItemsFetch(base, []));
    await Promise.all([none.sandbox.loadItems(), none.sandbox.loadOrders()]);
    assert.equal(none.element('summary').innerHTML, 'Showing 0 items.');
  }));

test('REQ-CAT-7: a search that matches items announces the match count', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, passThroughFetch(base));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    element('q').value = 'mug';
    await sandbox.loadItems();
    assert.equal(element('summary').innerHTML, '1 item matches “mug”.');

    element('q').value = 'e'; // matches "Enamel Mug", "Pocket Notebook" and "Fineliner Pen"
    await sandbox.loadItems();
    assert.equal(element('summary').innerHTML, '3 items match “e”.');
  }));

test('REQ-CAT-7: markup in a matching query is shown as inert text in the match-count wording', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, fakeItemsFetch(base, [{ sku: 'A', name: 'A', price: 1, stock: 1 }]));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    element('q').value = '<b>bold</b> & "quoted"';
    await sandbox.loadItems();

    const html = element('summary').innerHTML;
    assert.doesNotMatch(html, /<b>bold<\/b>/);
    assert.match(html, /1 item matches “&lt;b&gt;bold&lt;\/b&gt; &amp; &quot;quoted&quot;”\./);
  }));

test('REQ-CAT-7: a script-injection query in a match-count announcement does not run and is shown as inert text', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, fakeItemsFetch(base, [{ sku: 'A', name: 'A', price: 1, stock: 1 }]));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    element('q').value = '<img src=x onerror=alert(1)>';
    await sandbox.loadItems();

    const html = element('summary').innerHTML;
    assert.doesNotMatch(html, /<img[^>]*onerror/);
    assert.match(html, /1 item matches “&lt;img src=x onerror=alert\(1\)&gt;”\./);
  }));

test("REQ-CAT-10: markup in an item's name or SKU is shown as text, not parsed, in the item card", () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, fakeItemsFetch(base, [
      { sku: `<i>SKU</i>&'quote'`, name: '<b>bold</b> & "quoted"', price: 100, stock: 5 },
    ]));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);
    const html = element('items').innerHTML;

    assert.doesNotMatch(html, /<b>bold<\/b>/);
    assert.doesNotMatch(html, /<i>SKU<\/i>/);
    assert.match(html, /<div class="name">&lt;b&gt;bold&lt;\/b&gt; &amp; &quot;quoted&quot;<\/div>/);
    assert.match(html, /<div class="meta">&lt;i&gt;SKU&lt;\/i&gt;&amp;&#39;quote&#39; ·/);
    assert.match(html, /aria-label="Quantity of &lt;b&gt;bold&lt;\/b&gt; &amp; &quot;quoted&quot;"/);
    assert.match(html, /id="qty-&lt;i&gt;SKU&lt;\/i&gt;&amp;&#39;quote&#39;"/);
  }));

test("REQ-CAT-10: a script-injection attempt in an item's name or SKU does not run and is shown as inert text in the item card", () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const injectedName = '<img src=x onerror=alert(1)>';
    const injectedSku = '"><script>alert(1)</script>';
    const { sandbox, element } = createSandbox(script, fakeItemsFetch(base, [
      { sku: injectedSku, name: injectedName, price: 100, stock: 5 },
    ]));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);
    const html = element('items').innerHTML;

    assert.doesNotMatch(html, /<img[^>]*onerror/);
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.match(html, /&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  }));

test('REQ-CAT-7: a search that matches nothing announces the empty-state message', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, passThroughFetch(base));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    element('q').value = 'no-such-thing';
    await sandbox.loadItems();
    assert.equal(element('summary').innerHTML, 'Nothing matches “no-such-thing”.');
  }));

test('REQ-CAT-7: clearing the query announces the full count, like the automatic search on load', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, passThroughFetch(base));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    element('q').value = 'mug';
    await sandbox.loadItems();
    element('q').value = '';
    await sandbox.loadItems();
    assert.equal(element('summary').innerHTML, 'Showing 3 items.');
  }));

test('REQ-CAT-7: clearing the query announces zero items when the catalogue holds none', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, fakeItemsFetch(base, []));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    element('q').value = '';
    await sandbox.loadItems();
    assert.equal(element('summary').innerHTML, 'Showing 0 items.');
  }));

test('REQ-CAT-12: a genuinely empty catalogue says so rather than claiming an empty search matched nothing', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, fakeItemsFetch(base, []));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    element('q').value = '';
    await sandbox.loadItems();
    assert.match(element('items').innerHTML, />The catalogue is empty\.</);
    assert.doesNotMatch(element('items').innerHTML, /Nothing matches/);
  }));

test('REQ-CAT-12: a whitespace-only query against an empty catalogue is the same as no query', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, fakeItemsFetch(base, []));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    element('q').value = '   ';
    await sandbox.loadItems();
    assert.match(element('items').innerHTML, />The catalogue is empty\.</);
    assert.doesNotMatch(element('items').innerHTML, /Nothing matches/);
  }));

test('REQ-CAT-6: a non-empty query that matches nothing still shows the no-results message, not the empty-catalogue one', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, fakeItemsFetch(base, []));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    element('q').value = 'mug';
    await sandbox.loadItems();
    assert.match(element('items').innerHTML, />Nothing matches “mug”\.</);
    assert.doesNotMatch(element('items').innerHTML, /The catalogue is empty/);
  }));

test('REQ-CAT-12: the live region still announces zero items for an empty catalogue', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, fakeItemsFetch(base, []));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    assert.equal(element('summary').innerHTML, 'Showing 0 items.');
  }));

test('REQ-CAT-9: neither the empty-catalogue message nor the no-results message renders as a list item', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, fakeItemsFetch(base, []));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    for (const query of ['', 'mug']) {
      element('q').value = query;
      await sandbox.loadItems();
      assert.doesNotMatch(element('items').innerHTML, /<li[\s>]/);
      assert.match(element('items').innerHTML, /class="empty"/, 'an empty state is shown');
    }
  }));

test('REQ-CAT-7: a second search outcome replaces the summary rather than appending to it', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, passThroughFetch(base));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    element('q').value = 'mug';
    await sandbox.loadItems();
    element('q').value = 'pen';
    await sandbox.loadItems();

    assert.equal(element('summary').innerHTML, '1 item matches “pen”.');
    assert.doesNotMatch(element('summary').innerHTML, /mug/);
  }));

test('REQ-CAT-7: several non-superseded searches are each announced as they settle', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, passThroughFetch(base));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);
    const writesBefore = element('summary').history.length;

    element('q').value = 'mug';
    await sandbox.loadItems();
    element('q').value = 'no-such-thing';
    await sandbox.loadItems();
    element('q').value = 'pen';
    await sandbox.loadItems();

    assert.deepEqual(element('summary').history.slice(writesBefore), [
      '1 item matches “mug”.',
      'Nothing matches “no-such-thing”.',
      '1 item matches “pen”.',
    ]);
  }));

test('REQ-CAT-7: placing an accepted order refreshes the list without re-announcing the summary', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, passThroughFetch(base));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    element('q').value = 'mug';
    await sandbox.loadItems();
    const before = element('summary').innerHTML;
    const writesBefore = element('summary').history.length;

    element('qty-MUG-1').value = '1';
    await sandbox.order('MUG-1');

    assert.equal(element('summary').innerHTML, before);
    assert.equal(element('summary').history.length, writesBefore);
  }));

test('REQ-CAT-7: placing a rejected order also refreshes the list without re-announcing the summary', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, passThroughFetch(base));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    element('q').value = 'mug';
    await sandbox.loadItems();
    const before = element('summary').innerHTML;
    const writesBefore = element('summary').history.length;

    element('qty-MUG-1').value = '999'; // exceeds stock -> rejected
    await sandbox.order('MUG-1');

    assert.equal(element('summary').innerHTML, before);
    assert.equal(element('summary').history.length, writesBefore);
  }));

test('REQ-CAT-8: an out-of-order response is discarded, and the last query typed always wins', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const gates = { mu: deferred(), pen: deferred() };
    const fetchStub = async (path, options) => {
      if (path.startsWith('/api/items')) {
        const q = new URL(path, 'http://x').searchParams.get('q') || '';
        if (q === 'mu') {
          await gates.mu.promise;
          return { status: 200, json: async () => [{ sku: 'MU', name: 'Mu Item', price: 1, stock: 1 }] };
        }
        if (q === 'pen') {
          await gates.pen.promise;
          return { status: 200, json: async () => [{ sku: 'PEN-1', name: 'Fineliner Pen', price: 350, stock: 8 }] };
        }
      }
      return fetch(base + path, options);
    };
    const { sandbox, element } = createSandbox(script, fetchStub);
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    element('q').value = 'mu';
    const stale1 = sandbox.loadItems();
    element('q').value = 'pen';
    const stale2 = sandbox.loadItems();
    element('q').value = 'mug';
    await sandbox.loadItems();

    assert.equal(element('summary').innerHTML, '1 item matches “mug”.');

    // resolve the two earlier, now-superseded requests out of order
    gates.pen.resolve();
    await stale2;
    gates.mu.resolve();
    await stale1;

    assert.equal(element('summary').innerHTML, '1 item matches “mug”.');
    assert.doesNotMatch(element('items').innerHTML, /Mu Item|Fineliner Pen/);
  }));

test('REQ-CAT-8: a single settled search is unaffected', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, passThroughFetch(base));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    element('q').value = 'mug';
    await sandbox.loadItems();

    assert.equal(element('summary').innerHTML, '1 item matches “mug”.');
    assert.match(element('items').innerHTML, /Enamel Mug/);
  }));

test('REQ-CAT-8: a late order-triggered refresh does not revert a newer search', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const refreshGate = deferred();
    let gateNextMugRequest = false;

    const fetchStub = async (path, options) => {
      if (gateNextMugRequest && path.startsWith('/api/items')) {
        const q = new URL(path, 'http://x').searchParams.get('q') || '';
        if (q === 'mug') {
          gateNextMugRequest = false;
          await refreshGate.promise;
        }
      }
      return fetch(base + path, options);
    };
    const { sandbox, element } = createSandbox(script, fetchStub);
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);

    element('q').value = 'mug';
    await sandbox.loadItems();
    assert.equal(element('summary').innerHTML, '1 item matches “mug”.');

    element('qty-MUG-1').value = '1';
    gateNextMugRequest = true;
    // the order's refresh reserves its place in the request sequence for query "mug" right
    // when the order is placed, before its POST (and therefore the refresh itself) resolves
    const orderPromise = sandbox.order('MUG-1');

    element('q').value = 'cup';
    await sandbox.loadItems(); // issued after the order, so it wins the sequence
    assert.equal(element('summary').innerHTML, 'Nothing matches “cup”.');

    refreshGate.resolve();
    await orderPromise;

    assert.equal(element('summary').innerHTML, 'Nothing matches “cup”.');
    assert.doesNotMatch(element('items').innerHTML, /Enamel Mug/);
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

// REQ-CAT-11 — what a shopper sees when the catalogue itself cannot be loaded (#83).
//
// The real server always answers, so this is driven by standing in for it. Without this the page
// throws inside loadItems() and simply stops: no list, no message, nothing to act on.

test('REQ-CAT-11: a catalogue that cannot be loaded says so rather than showing nothing', async () => {
  await withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, () => Promise.reject(new TypeError('Failed to fetch')));
    await sandbox.loadItems();
    assert.match(element('items').innerHTML, /could not load the catalogue/i,
      'the message belongs where the items were, not only in the live region');
  });
});

test('REQ-CAT-11: the failure is announced, not only shown', async () => {
  await withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, () => Promise.reject(new TypeError('Failed to fetch')));
    await sandbox.loadItems();
    assert.notEqual(element('summary').innerHTML.trim(), '',
      'the summary is the live region a screen-reader user hears; silence there hides the failure');
  });
});

test('REQ-CAT-11: a reply that is not readable is treated as a failure, not as an empty catalogue', async () => {
  await withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, (path, options) =>
      path.startsWith('/api/items')
        ? Promise.resolve({ status: 502, json: async () => { throw new SyntaxError('Unexpected token <'); } })
        : fetch(base + path, options));
    await sandbox.loadItems();
    const shown = element('items').innerHTML;
    assert.doesNotMatch(shown, /Nothing matches/,
      'an unreadable reply is not the same as a search that matched nothing');
  });
});

test('REQ-CAT-11: a reply that parses but is not a list is a failure too', async () => {
  await withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    // A proxy's error envelope, or this server's own { reason } shape on a 4xx: valid JSON, but
    // not the item list. Without the shape check this reaches `.map` and throws.
    const { sandbox, element } = createSandbox(script, () =>
      Promise.resolve({ status: 502, json: async () => ({ reason: 'bad_gateway' }) }));
    await sandbox.loadItems();
    assert.match(element('items').innerHTML, /could not load the catalogue/i);
    assert.doesNotMatch(element('items').innerHTML, /Nothing matches/);
  });
});

test('REQ-CAT-11: the failure message carries a way to retry', async () => {
  await withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, () => Promise.reject(new TypeError('Failed to fetch')));
    await sandbox.loadItems();
    assert.match(element('items').innerHTML, /<button[^>]*>Try again<\/button>/,
      'the failure replaces every Order button, so it has to offer its own way back');
  });
});

test('REQ-CAT-11: a failure that arrived too late changes nothing', async () => {
  await withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const slow = deferred();
    let call = 0;
    const { sandbox, element } = createSandbox(script, (path, options) => {
      if (!path.startsWith('/api/items')) return fetch(base + path, options);
      return ++call === 1 ? slow.promise : fetch(base + path, options);
    });

    const first = sandbox.loadItems();   // will fail, but is superseded before it does
    await sandbox.loadItems();           // a newer request lands first and renders
    const rendered = element('items').innerHTML;

    slow.reject(new TypeError('Failed to fetch'));
    await first;

    assert.equal(element('items').innerHTML, rendered,
      'a superseded failure must be discarded exactly like a superseded success (REQ-CAT-8)');
  });
});

// REQ-CAT-13 — the maximum price control on the catalogue page (#110).
//
// Driven the way the browser drives it: set the field's value, fire its `input` event.

const PRICE_REFUSAL = 'Enter a maximum price such as 10 or 10.50.';

/** The page with its automatic load settled, and a log of every item-list request it made. */
async function pricePage(base, wrap = (f) => f) {
  const script = await loadPageScript(base);
  const requests = [];
  const real = passThroughFetch(base);
  const { sandbox, element } = createSandbox(script, wrap((path, options) => {
    if (path.startsWith('/api/items')) requests.push(path);
    return real(path, options);
  }));
  await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);
  requests.length = 0;
  const enter = (id, value) => { element(id).value = value; return element(id).fire('input'); };
  const price = (value) => enter('max-price', value);
  const search = (value) => enter('q', value);
  return { sandbox, element, requests, price, search };
}

const refusalShown = (element) => ({
  message: element('price-error').innerHTML,
  invalid: element('max-price').getAttribute('aria-invalid'),
  describedby: element('max-price').getAttribute('aria-describedby'),
});

test('REQ-CAT-14: the search field has a visible label, tied to it, that agrees with its accessible name', () =>
  withServer(async ({ base }) => {
    const html = await (await fetch(base + '/')).text();

    const label = html.match(/<label\b([^>]*\bfor="q"[^>]*)>([^<]*)<\/label>/);
    assert.ok(label, 'a <label for="q"> is on the page');
    assert.equal(label[2].trim(), 'Search the catalogue');
    assert.doesNotMatch(label[1], /\b(hidden|sr-only|visually-hidden)\b|display:\s*none/, 'the label is not hidden inline');

    const cls = label[1].match(/\bclass="([^"]+)"/);
    for (const name of cls ? cls[1].split(/\s+/) : []) {
      const rule = html.match(new RegExp('\\.' + name + '\\s*\\{([^}]*)\\}'));
      assert.doesNotMatch(rule ? rule[1] : '', /display:\s*none|visibility:\s*hidden|clip:|position:\s*absolute|(?:width|height):\s*1px/, 'the label is not visually hidden');
    }

    const input = html.match(/<input[^>]*\bid="q"[^>]*>/)[0];
    assert.match(input, /placeholder="/, 'the placeholder hint is still present');
    const aria = input.match(/\baria-label="([^"]*)"/);
    assert.ok(!aria || aria[1].includes('Search the catalogue'), 'any aria-label contains the visible label text');
  }));

test('REQ-CAT-14: the search label is fixed text and leaves the maximum price accessible name exactly Maximum price', () =>
  withServer(async ({ base }) => {
    const html = await (await fetch(base + '/')).text();
    const input = html.match(/<input[^>]*\bid="max-price"[^>]*>/)[0];
    assert.match(input, /\baria-label="Maximum price"/);
    assert.doesNotMatch(html, /<label[^>]*\bfor="max-price"/, 'the search label does not name the price field');
    assert.doesNotMatch(html.match(/<label[^>]*\bfor="q"[^>]*>[^<]*<\/label>/)?.[0] ?? '', /\$\{|\$\(|innerHTML/, 'the label takes no query');
  }));

test('REQ-CAT-13: the maximum price field has an accessible name independent of any placeholder', () =>
  withServer(async ({ base }) => {
    const html = await (await fetch(base + '/')).text();
    const input = html.match(/<input[^>]*\bid="max-price"[^>]*>/)[0];
    assert.match(input, /\baria-label="Maximum price"/);
  }));

test('REQ-CAT-13: a price narrows the list, and an item priced exactly at the ceiling is shown', () =>
  withServer(async ({ base }) => {
    const { element, requests, price } = await pricePage(base);
    await price('10');
    assert.deepEqual(requests, ['/api/items?max_price=1000']);
    assert.match(element('items').innerHTML, /Pocket Notebook/);
    assert.match(element('items').innerHTML, /Fineliner Pen/);
    assert.doesNotMatch(element('items').innerHTML, /Enamel Mug/);

    await price('8');
    assert.match(element('items').innerHTML, /Pocket Notebook/);
  }));

test('REQ-CAT-13: pounds and pence convert to cents from the digits', () =>
  withServer(async ({ base }) => {
    const { requests, price } = await pricePage(base);
    const cases = {
      '10': 1000, '10.5': 1050, '10.50': 1050, '19.99': 1999, '1.15': 115, '0.29': 29,
      '0': 0, '.5': 50, '.50': 50, '010': 1000, ' 10 ': 1000, '\u00a010': 1000,
      '9999999999999.99': 999999999999999,
    };
    for (const [typed, cents] of Object.entries(cases)) {
      requests.length = 0;
      await price(typed);
      assert.deepEqual(requests, ['/api/items?max_price=' + cents], `typing ${JSON.stringify(typed)}`);
    }
  }));

test('REQ-CAT-13: clearing the field, or leaving only whitespace, removes the ceiling', () =>
  withServer(async ({ base }) => {
    const { element, requests, price } = await pricePage(base);
    await price('10');
    requests.length = 0;
    await price('');
    assert.deepEqual(requests, ['/api/items']);
    assert.equal(element('summary').innerHTML, 'Showing 3 items.');
    await price('10');
    requests.length = 0;
    await price('  ');
    assert.deepEqual(requests, ['/api/items']);
  }));

test('REQ-CAT-13: the ceiling and the search apply together', () =>
  withServer(async ({ base }) => {
    const { element, requests, price, search } = await pricePage(base);
    await price('10');
    requests.length = 0;
    await search('e'); // Mug, Notebook, Pen — the mug is over the ceiling
    assert.deepEqual(requests, ['/api/items?q=e&max_price=1000']);
    assert.equal(element('summary').innerHTML, '2 items match “e” at £10.00 or less.');
    assert.doesNotMatch(element('items').innerHTML, /Enamel Mug/);
  }));

test('REQ-CAT-13: the summary states the ceiling', () =>
  withServer(async ({ base }) => {
    const { element, price, search } = await pricePage(base);
    await price('10');
    assert.equal(element('summary').innerHTML, 'Showing 2 items at £10.00 or less.');
    await price('3.50');
    assert.equal(element('summary').innerHTML, 'Showing 1 item at £3.50 or less.');
    await search('pen');
    assert.equal(element('summary').innerHTML, '1 item matches “pen” at £3.50 or less.');
  }));

test('REQ-CAT-13: a ceiling that excludes everything says so, never that the catalogue is empty', () =>
  withServer(async ({ base }) => {
    const { element, price } = await pricePage(base);
    await price('1');
    assert.match(element('items').innerHTML, />Nothing costs £1\.00 or less\.</);
    assert.doesNotMatch(element('items').innerHTML, /catalogue is empty/);
    assert.equal(element('summary').innerHTML, 'Showing 0 items at £1.00 or less.');
  }));

test('REQ-CAT-13: a ceiling and a query that match nothing together show the query as inert text', () =>
  withServer(async ({ base }) => {
    const { element, price, search } = await pricePage(base);
    await price('10');
    await search('<b>mug</b>');
    const said = 'Nothing matches “&lt;b&gt;mug&lt;/b&gt;” at £10.00 or less.';
    assert.match(element('items').innerHTML, new RegExp('>' + said.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '<'));
    assert.equal(element('summary').innerHTML, said);
  }));

test('REQ-CAT-13: a whitespace-only search with a ceiling is no query', () =>
  withServer(async ({ base }) => {
    const { element, price, search } = await pricePage(base);
    await price('1');
    await search('   ');
    assert.match(element('items').innerHTML, />Nothing costs £1\.00 or less\.</);
    assert.equal(element('summary').innerHTML, 'Showing 0 items at £1.00 or less.');
  }));

test('REQ-CAT-13: a half-typed decimal sends no request, announces nothing, and is not invalid', () =>
  withServer(async ({ base }) => {
    const { element, requests, price } = await pricePage(base);
    const before = element('summary').history.length;
    for (const typed of ['10.', '.']) {
      await price(typed);
      assert.deepEqual(requests, []);
      assert.equal(element('summary').history.length, before);
      assert.equal(element('max-price').getAttribute('aria-invalid'), null);
      assert.equal(element('price-error').innerHTML, '');
    }
  }));

test('REQ-CAT-13: a value that is not a price is refused on the page, with no request', () =>
  withServer(async ({ base }) => {
    const { element, requests, price } = await pricePage(base);
    const itemsBefore = element('items').innerHTML;
    for (const typed of ['abc', '-1', '+1', '1e3', '10.505', '£10', '1,000', '٣', '１０', '12345678901234', '0012345678901234.5']) {
      await price(typed);
      assert.deepEqual(refusalShown(element), { message: PRICE_REFUSAL, invalid: 'true', describedby: 'price-error' }, typed);
      assert.equal(element('summary').innerHTML, PRICE_REFUSAL, typed);
    }
    assert.deepEqual(requests, []);
    assert.equal(element('items').innerHTML, itemsBefore);
  }));

test('REQ-CAT-13: retyping a refused value announces the refusal again', () =>
  withServer(async ({ base }) => {
    const { element, price } = await pricePage(base);
    await price('abc');
    const writes = element('summary').history.length;
    await price('abcd');
    assert.equal(element('summary').history.length, writes + 1);
    assert.equal(element('summary').innerHTML, PRICE_REFUSAL);
  }));

test('REQ-CAT-13: editing a refusal back to a half-typed decimal clears the field message only', () =>
  withServer(async ({ base }) => {
    const { element, requests, price } = await pricePage(base);
    await price('abc');
    await price('10.');
    assert.deepEqual(requests, []);
    assert.deepEqual(refusalShown(element), { message: '', invalid: null, describedby: null });
    assert.equal(element('summary').innerHTML, PRICE_REFUSAL);
  }));

test('REQ-CAT-13: correcting a refused value resumes filtering', () =>
  withServer(async ({ base }) => {
    for (const fix of ['10', '']) {
      await withServer(async ({ base }) => {
        const { element, requests, price } = await pricePage(base);
        await price('abc');
        await price(fix);
        assert.deepEqual(refusalShown(element), { message: '', invalid: null, describedby: null });
        assert.deepEqual(requests, [fix ? '/api/items?max_price=1000' : '/api/items']);
      });
    }
  }));

test('REQ-CAT-13: a refusal does not drop the automatic load', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const gate = deferred();
    const { sandbox, element } = createSandbox(script, async (path, options) => {
      await gate.promise;
      return fetch(base + path, options);
    });
    const load = sandbox.loadItems();
    element('max-price').value = 'abc';
    await element('max-price').fire('input');
    assert.equal(element('summary').innerHTML, PRICE_REFUSAL);

    gate.resolve();
    await load;
    assert.match(element('items').innerHTML, /Enamel Mug/);
    assert.equal(element('summary').innerHTML, 'Showing 3 items.');
    assert.deepEqual(refusalShown(element), { message: PRICE_REFUSAL, invalid: 'true', describedby: 'price-error' });
  }));

test('REQ-CAT-13: a refusal does not freeze stock after an order', () =>
  withServer(async ({ base }) => {
    const gate = deferred();
    let hold = false;
    const { sandbox, element, price } = await pricePage(base, (real) => async (path, options) => {
      if (hold && path.startsWith('/api/items')) await gate.promise;
      return real(path, options);
    });
    element('qty-MUG-1').value = '2';
    hold = true;
    const ordering = sandbox.order('MUG-1');
    await new Promise((r) => setTimeout(r, 50)); // the POST has landed; the refresh is in flight
    await price('abc');
    const writes = element('summary').history.length;
    gate.resolve();
    await ordering;

    assert.match(element('items').innerHTML, /45 in stock/);
    assert.equal(element('summary').history.length, writes);
    assert.deepEqual(refusalShown(element), { message: PRICE_REFUSAL, invalid: 'true', describedby: 'price-error' });
  }));

test('REQ-CAT-13: while the field is incomplete or refused, other requests carry the last applied ceiling', () =>
  withServer(async ({ base }) => {
    for (const typed of ['10.', 'abc']) {
      await withServer(async ({ base }) => {
        const { sandbox, element, requests, price, search } = await pricePage(base);
        await price('10');
        await price(typed);
        requests.length = 0;

        await search('pen');
        assert.deepEqual(requests, ['/api/items?q=pen&max_price=1000'], typed);
        assert.equal(element('summary').innerHTML, '1 item matches “pen” at £10.00 or less.');

        element('qty-PEN-1').value = '1';
        requests.length = 0;
        const before = element('summary').history.length;
        await sandbox.order('PEN-1');
        assert.deepEqual(requests, ['/api/items?q=pen&max_price=1000'], typed);
        assert.equal(element('summary').history.length, before);

        const expected = typed === 'abc' ? { message: PRICE_REFUSAL, invalid: 'true', describedby: 'price-error' }
          : { message: '', invalid: null, describedby: null };
        assert.deepEqual(refusalShown(element), expected);
      });
    }
  }));

test('REQ-CAT-13: with no ceiling ever applied, a refused field leaves max_price off other requests', () =>
  withServer(async ({ base }) => {
    const { sandbox, element, requests, price, search } = await pricePage(base);
    await price('abc');
    await search('pen');
    assert.deepEqual(requests, ['/api/items?q=pen']);
    element('qty-PEN-1').value = '1';
    requests.length = 0;
    await sandbox.order('PEN-1');
    assert.deepEqual(requests, ['/api/items?q=pen']);
  }));

test('REQ-CAT-13: an order placed while the field is refused keeps the ceiling and the refusal sentence', () =>
  withServer(async ({ base }) => {
    const { sandbox, element, requests, price } = await pricePage(base);
    await price('10');
    await price('abc');
    element('qty-PEN-1').value = '1';
    requests.length = 0;
    await sandbox.order('PEN-1');
    assert.deepEqual(requests, ['/api/items?max_price=1000']);
    assert.doesNotMatch(element('items').innerHTML, /Enamel Mug/);
    assert.equal(element('summary').innerHTML, PRICE_REFUSAL);
    assert.deepEqual(refusalShown(element), { message: PRICE_REFUSAL, invalid: 'true', describedby: 'price-error' });
  }));

test('REQ-CAT-13: a search change during a refusal that matches nothing uses the ceiling wording', () =>
  withServer(async ({ base }) => {
    const { element, price, search } = await pricePage(base);
    await price('10');
    await price('abc');
    await search('mug'); // the mug costs 12.50 — over the last applied ceiling
    assert.equal(element('summary').innerHTML, 'Nothing matches “mug” at £10.00 or less.');
    assert.match(element('items').innerHTML, />Nothing matches “mug” at £10\.00 or less\.</);
    assert.equal(element('price-error').innerHTML, PRICE_REFUSAL);
  }));

test('REQ-CAT-13: the retry after a failed load carries the last applied ceiling', () =>
  withServer(async ({ base }) => {
    let failing = false;
    const { sandbox, element, requests, price } = await pricePage(base, (real) => (path, options) =>
      failing && path.startsWith('/api/items') ? Promise.reject(new TypeError('Failed to fetch')) : real(path, options));
    await price('10');
    await price('abc');
    failing = true;
    await sandbox.loadItems();
    assert.match(element('items').innerHTML, /could not load the catalogue/i);
    assert.doesNotMatch(element('items').innerHTML, /Nothing costs/);
    failing = false;
    requests.length = 0;
    await sandbox.loadItems(); // what the retry button runs
    assert.deepEqual(requests, ['/api/items?max_price=1000']);
  }));

test('REQ-CAT-13: a stale response from an earlier ceiling is discarded', () =>
  withServer(async ({ base }) => {
    const slow = deferred();
    let slowNext = false;
    const { element, price } = await pricePage(base, (real) => async (path, options) => {
      if (slowNext && path === '/api/items?max_price=1000') { slowNext = false; await slow.promise; }
      return real(path, options);
    });
    slowNext = true;
    const stale = price('10');
    await price('3.50');
    slow.resolve();
    await stale;
    assert.equal(element('summary').innerHTML, 'Showing 1 item at £3.50 or less.');
    assert.doesNotMatch(element('items').innerHTML, /Pocket Notebook/);
  }));

test('REQ-CAT-13: an order refresh keeps the ceiling without re-announcing', () =>
  withServer(async ({ base }) => {
    const { sandbox, element, requests, price } = await pricePage(base);
    await price('10');
    element('qty-PEN-1').value = '1';
    requests.length = 0;
    const before = element('summary').history.length;
    await sandbox.order('PEN-1');
    assert.deepEqual(requests, ['/api/items?max_price=1000']);
    assert.equal(element('summary').history.length, before);
  }));

test('REQ-CAT-9: a ceiling that leaves nothing shows the ceiling message in place of the list, not as a list item', () =>
  withServer(async ({ base }) => {
    const { element, price } = await pricePage(base);
    await price('1');
    assert.doesNotMatch(element('items').innerHTML, /<li[\s>]/);
    assert.match(element('items').innerHTML, /class="empty"/);
  }));

test('REQ-CAT-12: a zero result under a ceiling is not an empty catalogue, and no ceiling still is', () =>
  withServer(async ({ base }) => {
    const script = await loadPageScript(base);
    const { sandbox, element } = createSandbox(script, fakeItemsFetch(base, []));
    await Promise.all([sandbox.loadItems(), sandbox.loadOrders()]);
    assert.match(element('items').innerHTML, />The catalogue is empty\.</);
    assert.equal(element('summary').innerHTML, 'Showing 0 items.');

    element('max-price').value = '10';
    await element('max-price').fire('input');
    assert.doesNotMatch(element('items').innerHTML, /catalogue is empty/);
    assert.match(element('items').innerHTML, />Nothing costs £10\.00 or less\.</);
  }));
