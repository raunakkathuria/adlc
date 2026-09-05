import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { withServer } from './helpers.mjs';

const LIVE_REGION = /role="status"|aria-live="(polite|assertive)"/;

/**
 * Decode the HTML entities `escapeHtml` produces, the way a browser's attribute-value parser
 * decodes them back into characters. Limited to the entities this app writes — a stand-in for
 * a browser parse, not a general HTML decoder. `&amp;` decodes last so a literal "&lt;" in the
 * original text (itself escaped to "&amp;lt;") does not get mistaken for an escaped "<".
 */
function decodeHtmlEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Parse an opening tag's attributes, decoding entity-escaped values as a browser would. */
function parseAttrs(tag) {
  const attrs = {};
  for (const m of tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
    attrs[m[1]] = decodeHtmlEntities(m[2]);
  }
  return attrs;
}

/**
 * A `fetch` that answers every `/items` request with a fixed, caller-chosen result — for
 * injecting catalog data (like a markup-bearing sku) the real in-memory catalog has no write
 * path to produce. Everything else still talks to the real server.
 */
function fakeItemsFetch(base, items) {
  return (path, options) => {
    if (path.startsWith('/api/items?') || path === '/api/items') {
      return Promise.resolve({ status: 200, json: async () => items });
    }
    return fetch(base + path, options);
  };
}

/**
 * Load the real page served for `/`, and run its actual inline script against a minimal
 * DOM stub wired to the live server, so REQ-ORD-7 is exercised the way a browser would run
 * it rather than by pattern-matching the script's source.
 *
 * The `items` element's `innerHTML` setter parses the rendered quantity inputs and Order
 * buttons for real (decoding attribute values as a browser would), so `querySelectorAll` and
 * a button's own `click()` exercise the app's actual listener-attachment code path, and a
 * quantity input found by its rendered, decoded `id` is the same element the app's `order()`
 * looks up — rather than a stand-in keyed by a raw string the test already knows.
 */
async function loadClientPage(base, { fetch: fetchImpl } = {}) {
  const html = await (await fetch(base + '/')).text();
  const noteMarkup = html.match(/<div id="note"[^>]*>/)?.[0] ?? '';
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  const elements = new Map();
  let itemButtons = [];

  function makeStub() {
    return {
      value: '',
      innerHTML: '',
      dataset: {},
      listeners: {},
      addEventListener(type, fn) { this.listeners[type] = fn; },
      click() { return this.listeners.click?.(); },
      querySelectorAll() { return []; },
    };
  }

  function renderItemsMarkup(itemsHtml) {
    for (const m of itemsHtml.matchAll(/<input[^>]*\btype="number"[^>]*>/g)) {
      const attrs = parseAttrs(m[0]);
      if (attrs.id) element(attrs.id).value = attrs.value ?? '';
    }
    itemButtons = [...itemsHtml.matchAll(/<button[^>]*>/g)].map((m) => {
      const button = makeStub();
      button.dataset = { sku: parseAttrs(m[0])['data-sku'] };
      return button;
    });
  }

  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const stub = makeStub();
    if (id === 'items') {
      let html = '';
      Object.defineProperty(stub, 'innerHTML', {
        get() { return html; },
        set(v) { html = v; renderItemsMarkup(v); },
      });
      stub.querySelectorAll = (selector) => (selector === 'button' ? itemButtons : []);
    }
    elements.set(id, stub);
    return stub;
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
    getElementById: element,
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

// The scenario's "WHEN 21 units are ordered" names no SKU, and REQ-ORD-3 says the limit applies
// "regardless of stock" — so the cap must win even for an item whose stock is also below the
// requested qty, not only for items with stock to spare (issue #85).
test('REQ-ORD-3: the unit limit rejects an order even when stock is also insufficient', () =>
  withServer(async ({ post }) => {
    const { status, body } = await post('/api/orders', { sku: 'PEN-1', qty: 21 });
    assert.equal(status, 422);
    assert.equal(body.reason, 'over_limit');
  }));

// REQ-ORD-4 promises "every rejection reason, not just some of them", and the test above covers
// exactly one — insufficient_stock, which happens to return before anything is written. Each
// reason gets its own case, because the requirement is about all of them.
for (const [name, order] of [
  ['unknown_sku', { sku: 'NOPE-1', qty: 1 }],
  ['invalid_qty', { sku: 'MUG-1', qty: 0 }],
  ['insufficient_stock', { sku: 'PEN-1', qty: 12 }],
  ['over_limit', { sku: 'MUG-1', qty: 21 }],   // under MUG-1's stock, over the 20-unit limit
]) {
  test(`REQ-ORD-4: a rejection for ${name} consumes nothing`, () =>
    withServer(async ({ post, get }) => {
      const { body: before } = await get('/api/items');

      const { status, body } = await post('/api/orders', order);
      assert.equal(status >= 400, true, 'this order is meant to be rejected');
      assert.equal(body.reason, name);

      const { body: after } = await get('/api/items');
      assert.deepEqual(after, before, 'a rejection must leave every item exactly as it was');
      const { body: orders } = await get('/api/orders');
      assert.equal(orders.length, 0, 'a rejected order is not recorded');
    }));
}

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

test("REQ-ORD-7: a successful order's confirmation shows a markup SKU as inert text and runs no script", () =>
  withServer(async ({ base }) => {
    const markupSku = '<img src=x onerror=alert(1)>';
    const page = await loadClientPage(base, {
      fetch: (path, options) =>
        path === '/api/orders' && options?.method === 'POST'
          ? Promise.resolve({ status: 201, json: async () => ({ id: 1, sku: markupSku, qty: 2, total: 200 }) })
          : fetch(base + path, options),
    });

    await page.order('MUG-1', 2); // the sku sent is irrelevant; the stubbed POST always echoes markupSku
    const html = page.noteHtml();
    assert.doesNotMatch(html, /<img[^>]*onerror/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
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

test("REQ-ORD-8: markup in an item's name is shown as text within the Order button's accessible name, not parsed", () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base, {
      fetch: fakeItemsFetch(base, [{ sku: 'SKU-1', name: '<b>bold</b> & "quoted"', price: 100, stock: 5 }]),
    });
    const button = orderButtonMarkup(page.itemsHtml(), 'SKU-1');
    assert.ok(button, 'expected an Order button for SKU-1');
    assert.doesNotMatch(button, /<b>bold<\/b>/);
    assert.match(button, /aria-label="Order &lt;b&gt;bold&lt;\/b&gt; &amp; &quot;quoted&quot;"/);
  }));

test("REQ-ORD-8: markup in an item's SKU is shown as text in the Order button's data-sku attribute, not parsed", () =>
  withServer(async ({ base }) => {
    const injectedSku = '"><script>alert(1)</script>';
    const page = await loadClientPage(base, {
      fetch: fakeItemsFetch(base, [{ sku: injectedSku, name: 'Widget', price: 100, stock: 5 }]),
    });
    const html = page.itemsHtml();
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
    assert.match(html, /data-sku="&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;"/);
  }));

test('REQ-CAT-10, REQ-ORD-8: an item whose sku contains markup can still be ordered, proven through the rendered markup', () =>
  withServer(async ({ base }) => {
    const rawSku = `SKU&"'<>1`;
    const fakeItem = { sku: rawSku, name: 'Marked-up Mug', price: 500, stock: 10 };
    let capturedOrderRequest;
    const itemsFetch = fakeItemsFetch(base, [fakeItem]);

    const page = await loadClientPage(base, {
      fetch: async (path, options) => {
        if (path === '/api/orders' && options?.method === 'POST') {
          capturedOrderRequest = JSON.parse(options.body);
        }
        return itemsFetch(path, options);
      },
    });

    // Recover the quantity input's id and the button's data-sku from the page's own rendered,
    // escaped markup — decoded the way a browser's attribute parser would — rather than reusing
    // the raw fixture sku as a shortcut.
    const html = page.itemsHtml();
    const qtyIdEscaped = html.match(/<input[^>]*\btype="number"[^>]*\bid="([^"]*)"/)?.[1];
    const dataSkuEscaped = html.match(/<button[^>]*\bdata-sku="([^"]*)"/)?.[1];
    assert.ok(qtyIdEscaped, 'expected a quantity input in the rendered markup');
    assert.ok(dataSkuEscaped, 'expected an Order button with data-sku in the rendered markup');

    const qtyId = decodeHtmlEntities(qtyIdEscaped);
    const recoveredSku = decodeHtmlEntities(dataSkuEscaped);
    assert.equal(qtyId, `qty-${rawSku}`);
    assert.equal(recoveredSku, rawSku);

    page.getElementById(qtyId).value = '3';

    const buttons = page.getElementById('items').querySelectorAll('button');
    assert.equal(buttons.length, 1, 'expected exactly one rendered Order button');
    assert.equal(buttons[0].dataset.sku, recoveredSku);

    await buttons[0].click(); // drives the app's real click-listener-attachment code path

    assert.ok(capturedOrderRequest, 'expected the click to reach POST /api/orders');
    assert.equal(capturedOrderRequest.sku, rawSku, 'the SKU sent to the API must be the unescaped, stored form');
    assert.equal(capturedOrderRequest.qty, 3);

    // Known limit of this harness: it is a Node-based DOM stand-in, not a browser engine, so
    // this proves the app's escape-on-write and this test's decode-on-read logic agree with
    // each other, not that an actual browser's HTML parser round-trips these characters
    // identically. See the delta's open question.
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
    await page.order('PEN-1', 12); // more than stock (8), but under the unit limit — insufficient_stock alone
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

// REQ-ORD-10 and REQ-ORD-11 — the last unescaped interpolation on the page, and what a shopper
// is told when the server cannot be reached. Both found by the line's own quality station (#81,
// #83) and both pre-existing.
//
// The real server cannot produce either condition: it never rejects a connection, and it always
// answers JSON. So both are driven by standing in for it, which is the only way to watch the
// failure path fail.

/** A fetch that refuses to connect, the way a dropped network does. */
function unreachableFetch() {
  return () => Promise.reject(new TypeError('Failed to fetch'));
}

/** A fetch that answers, but with something that is not JSON. */
function nonJsonFetch(base) {
  return (path, options) =>
    path.startsWith('/api')
      ? Promise.resolve({ status: 502, json: async () => { throw new SyntaxError('Unexpected token <'); } })
      : fetch(base + path, options);
}

/**
 * A `fetch` that answers the order history with a fixed, caller-chosen list. The real server
 * gates every order through its own catalogue (three clean SKUs, no write path), so a
 * markup-bearing SKU cannot be made to reach the history any other way. POSTs still go to the
 * real server, so ordering keeps working.
 */
function fakeOrdersFetch(base, orders) {
  return (path, options) => {
    if (path === '/api/orders' && !options) {
      return Promise.resolve({ status: 200, json: async () => orders });
    }
    return fetch(base + path, options);
  };
}

test('REQ-ORD-10: an ordinary order-history entry is unchanged', async () => {
  await withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.order('MUG-1', 2);
    const html = page.getElementById('orders').innerHTML;
    assert.match(html, /#1\b/, 'the order number is shown');
    assert.match(html, /2 × MUG-1/, 'the quantity and SKU, in that order');
    assert.match(html, /£25\.00/, 'and the total');
  });
});

test('REQ-ORD-10: markup in an order-history SKU is shown as text, not parsed', async () => {
  await withServer(async ({ base }) => {
    const hostile = '<img src=x onerror="alert(1)">';
    const page = await loadClientPage(base, {
      fetch: fakeOrdersFetch(base, [{ id: 1, sku: hostile, qty: 1, total: 1250 }]),
    });
    const html = page.getElementById('orders').innerHTML;

    assert.doesNotMatch(html, /<img/, 'the SKU must not become an element');
    // The characters "onerror=" survive as text, which is harmless; what must not survive is the
    // raw quote that would let them become an attribute.
    assert.doesNotMatch(html, /onerror="/, 'the quote that would open an attribute is escaped');
    assert.match(html, /&lt;img/, 'it is displayed as inert text instead');
    assert.match(html, /&quot;|&#39;/, 'quotes inside it are escaped too');
  });
});

test('REQ-ORD-11: an order that could not be submitted says so, and does not claim it was placed', async () => {
  await withServer(async ({ base }) => {
    const page = await loadClientPage(base, { fetch: unreachableFetch() });
    await page.order('MUG-1', 1);
    const shown = page.noteHtml();
    assert.notEqual(shown, '', 'silence is the worst outcome: the shopper cannot tell what happened');
    assert.doesNotMatch(shown, /Order #/, 'it must not show a confirmation for an order that never left');
    assert.doesNotMatch(shown, /Rejected/,
      'an order that never arrived was not decided on — calling it a rejection is the whole point of this requirement');
    assert.match(shown, /was not sent/i, 'it has to say what actually happened');
  });
});

test('REQ-ORD-11: a reply that is not readable is reported, not swallowed', async () => {
  await withServer(async ({ base }) => {
    const page = await loadClientPage(base, { fetch: nonJsonFetch(base) });
    await page.order('MUG-1', 1);
    const shown = page.noteHtml();
    assert.notEqual(shown, '', 'an unreadable reply must still reach the shopper');
    assert.doesNotMatch(shown, /Rejected/, 'an unreadable reply is not a decision to refuse');
    assert.match(shown, /was not sent/i);
  });
});

test('REQ-CAT-11 × REQ-CAT-7: a refresh that fails after an order does not touch the summary', async () => {
  await withServer(async ({ base }) => {
    let live = true;
    const page = await loadClientPage(base, {
      fetch: (path, options) =>
        live ? fetch(base + path, options) : Promise.reject(new TypeError('Failed to fetch')),
    });
    const summaryBefore = page.getElementById('summary').innerHTML;
    assert.notEqual(summaryBefore, '', 'the load announced something to begin with');

    live = false;                       // the server goes away mid-order
    await page.order('MUG-1', 1);

    assert.equal(page.getElementById('summary').innerHTML, summaryBefore,
      'REQ-CAT-7 promises a post-order refresh leaves the summary alone, failure included');
    assert.match(page.noteHtml(), /could not reach/i,
      'the shopper still hears about it — through the order-outcome region, which owns this');
  });
});

test('REQ-ORD-11: an order history that cannot be loaded is not an empty history', async () => {
  await withServer(async ({ base }) => {
    const page = await loadClientPage(base, {
      fetch: (path, options) =>
        path === '/api/orders' && !options
          ? Promise.reject(new TypeError('Failed to fetch'))
          : fetch(base + path, options),
    });
    const html = page.getElementById('orders').innerHTML;
    assert.match(html, /could not load your orders/i);
    assert.doesNotMatch(html, /No orders yet/,
      'telling a shopper they have no orders when we simply could not ask is the wrong fact');
    assert.match(html, /<button[^>]*>Try again<\/button>/,
      'nothing else reloads the history except placing another order');
  });
});

test('REQ-ORD-11: a history reply that parses but is not a list is a failure too', async () => {
  await withServer(async ({ base }) => {
    const page = await loadClientPage(base, {
      fetch: (path, options) =>
        path === '/api/orders' && !options
          ? Promise.resolve({ status: 502, json: async () => ({ reason: 'bad_gateway' }) })
          : fetch(base + path, options),
    });
    assert.match(page.getElementById('orders').innerHTML, /could not load your orders/i);
  });
});
