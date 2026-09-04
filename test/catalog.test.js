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
  return {
    get value() { return value; },
    set value(v) { value = v; },
    get innerHTML() { return innerHTML; },
    set innerHTML(v) { innerHTML = v; history.push(v); },
    get history() { return history; },
    addEventListener() {},
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
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
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
