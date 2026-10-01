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
  let cards = [];
  const body = { tagName: 'BODY' };
  const document = { getElementById: element, activeElement: body, body };

  function makeStub(tagName = 'DIV') {
    const stub = {
      tagName,
      value: '',
      innerHTML: '',
      dataset: {},
      listeners: {},
      attrs: {},
      addEventListener(type, fn) { this.listeners[type] = fn; },
      // a browser fires no click on a disabled button, whether by pointer, Enter or Space
      click() { return 'disabled' in this.attrs ? undefined : this.listeners.click?.(); },
      querySelectorAll() { return []; },
      setAttribute(name, v) { this.attrs[name] = String(v); },
      removeAttribute(name) { delete this.attrs[name]; },
      closest(selector) { return selector === 'li.card' ? (this.card ?? null) : null; },
      // a disabled control, or a card with no tabindex, refuses focus, as in a browser
      focus() {
        if ('disabled' in this.attrs) return;
        if (this.tagName === 'LI' && !('tabindex' in this.attrs)) return;
        document.activeElement = this;
      },
    };
    // `control.disabled = x` reflects to the attribute, and a control disabled while it holds
    // focus drops it to the page, as in a browser
    Object.defineProperty(stub, 'disabled', {
      get() { return 'disabled' in this.attrs; },
      set(v) {
        if (v) {
          this.attrs.disabled = '';
          if (document.activeElement === this) document.activeElement = body;
        } else delete this.attrs.disabled;
      },
    });
    return stub;
  }

  const isDisabled = (tag) => /\sdisabled\b/.test(tag.replace(/="[^"]*"/g, ''));

  function renderItemsMarkup(itemsHtml) {
    // the old cards are gone, and focus on any of them goes to the page
    if (document.activeElement.card) document.activeElement = body;
    itemButtons = [...itemsHtml.matchAll(/<button[^>]*>/g)].map((m) => {
      const button = makeStub('BUTTON');
      button.attrs = parseAttrs(m[0]);
      if (isDisabled(m[0])) button.attrs.disabled = '';
      button.dataset = { sku: button.attrs['data-sku'] };
      return button;
    });
    cards = [...itemsHtml.matchAll(/<li class="card"[\s\S]*?<\/li>/g)].map((m) => {
      const card = makeStub('LI');
      card.card = card;
      card.attrs = parseAttrs(m[0].match(/^<li[^>]*>/)[0]);
      card.dataset = { sku: card.attrs['data-sku'] };
      card.sku = parseAttrs(m[0].match(/<button[^>]*>/)?.[0] ?? '')['data-sku']; // the test's own key
      const inputTag = m[0].match(/<input[^>]*>/)?.[0];
      if (inputTag) {
        const input = makeStub('INPUT');
        input.attrs = parseAttrs(inputTag);
        if (isDisabled(inputTag)) input.attrs.disabled = '';
        input.value = input.attrs.value ?? '';
        input.card = card;
        card.input = input;
        elements.set(input.attrs.id, input);
      }
      card.button = itemButtons.find((b) => b.dataset.sku === card.sku);
      if (card.button) card.button.card = card;
      card.querySelector = (selector) => (selector === 'button' ? card.button : selector === 'input' ? card.input : null);
      return card;
    });
  }

  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const stub = makeStub(id === 'q' || id === 'max-price' ? 'INPUT' : 'DIV');
    if (id === 'items') {
      let html = '';
      Object.defineProperty(stub, 'innerHTML', {
        get() { return html; },
        set(v) { html = v; renderItemsMarkup(v); },
      });
      stub.querySelectorAll = (selector) => (selector === 'button' ? itemButtons : selector === 'li.card' ? cards : []);
    }
    elements.set(id, stub);
    return stub;
  }

  const sandbox = {
    document,
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
    // the shopper typing: sets the box and fires the page's own input listener
    type: async (query) => {
      element('q').value = query;
      await element('q').listeners.input();
    },
    getElementById: element,
    // the live button the shopper has in front of them, as last rendered and since updated
    orderButton: (sku) => itemButtons.find((b) => b.dataset.sku === sku),
    // focus: the shopper's own moves, and what the page has left focused
    card: (sku) => cards.find((c) => c.sku === sku),
    quantityField: (sku) => cards.find((c) => c.sku === sku)?.input,
    active: () => document.activeElement,
    focusOn: (control) => { control.focus(); assert.equal(document.activeElement, control, 'precondition: the control took focus'); },
    blur: () => { document.activeElement = body; },
    control: (tagName) => makeStub(tagName),
    // what Tab can reach in the list: no disabled control, no card without a tabindex of 0 or more
    tabStops: () => [...cards.flatMap((c) => [c.input, c.button]), ...cards.filter((c) => Number(c.attrs.tabindex ?? -1) >= 0)]
      .filter((c) => c && !c.disabled),
  };
}

/**
 * A `fetch` for holding chosen requests back, so the shopper can act while an order or a refresh
 * is in flight. `hold('GET /api/items')` holds the next such request, exact method and path, until
 * the returned function is called. `offline` makes every order fail to send (REQ-ORD-11).
 */
function gatedFetch(base, { offline = false } = {}) {
  const holds = [];
  const gated = (path, options) => {
    const key = `${options?.method ?? 'GET'} ${path}`;
    if (offline && key === 'POST /api/orders') return Promise.reject(new Error('offline'));
    const at = holds.findIndex((h) => h.key === key);
    if (at === -1) return fetch(base + path, options);
    const [{ gate }] = holds.splice(at, 1);
    return gate.then(() => fetch(base + path, options));
  };
  gated.hold = (key) => {
    let release;
    holds.push({ key, gate: new Promise((resolve) => { release = resolve; }) });
    return release;
  };
  return gated;
}

/** Let the page run until `ready()` holds — bounded in turns, not time, so a stuck test fails rather than hangs. */
async function until(ready, what) {
  for (let turns = 0; turns < 2000 && !ready(); turns++) await new Promise((resolve) => setTimeout(resolve, 1));
  assert.ok(ready(), `gave up waiting for ${what}`);
}

function orderButtonMarkup(itemsHtml, sku) {
  return itemsHtml.match(new RegExp(`<button[^>]*data-sku="${sku}"[^>]*>[\\s\\S]*?</button>`))?.[0];
}

/** The rendered quantity input for a SKU, parsed into its attributes as a browser would read them. */
function quantityInput(itemsHtml, sku) {
  const input = itemsHtml.match(new RegExp(`<input[^>]*\\bid="qty-${sku}"[^>]*>`))?.[0];
  assert.ok(input, `expected a quantity input for ${sku}`);
  return parseAttrs(input);
}

/**
 * Whether the rendered Order button for a SKU is disabled. Only the attribute's presence counts,
 * the way a browser reads a boolean attribute — `disabled`, `disabled=""` and `disabled="disabled"`
 * all disable. Quoted values are stripped first so an item *named* "disabled" cannot pass for it.
 */
function orderButtonDisabled(itemsHtml, sku) {
  const button = orderButtonMarkup(itemsHtml, sku);
  assert.ok(button, `expected an Order button for ${sku}`);
  const openingTag = button.match(/^<button[^>]*>/)[0].replace(/="[^"]*"/g, '');
  return /\sdisabled\b/.test(openingTag);
}

test('REQ-ORD-1: an accepted order is created and takes units out of stock', () =>
  withServer(async ({ post, get, stock }) => {
    const before = await stock('MUG-1');

    const { status, body } = await post('/api/orders', { sku: 'MUG-1', qty: 2 });
    assert.equal(status, 201);
    assert.equal(body.sku, 'MUG-1');
    assert.equal(body.name, 'Enamel Mug');
    assert.equal(body.qty, 2);
    assert.equal(body.total, 2500);

    assert.equal(await stock('MUG-1'), before - 2);

    const { body: orders } = await get('/api/orders');
    assert.equal(orders.length, 1);
    assert.equal(orders[0].id, body.id);
    assert.equal(orders[0].name, 'Enamel Mug');
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

// REQ-ORD-12 — the quantity input's `max` is the lesser of the 20-unit cap and the item's own stock.
// The seed's MUG-1 (47) is bound by the cap and PEN-1 (8) by its stock; the two boundaries the seed
// lacks — exactly 20, and 0 — are reached through real orders before the page loads.

test('REQ-ORD-12: a well-stocked item is hinted by the order cap', () =>
  withServer(async ({ base, stock }) => {
    assert.ok((await stock('MUG-1')) >= 20, 'precondition: MUG-1 has 20 or more in stock');
    const page = await loadClientPage(base);
    const input = quantityInput(page.itemsHtml(), 'MUG-1');
    assert.equal(input.max, '20');
    assert.equal(input.min, '1');
  }));

test('REQ-ORD-12: a scarcer item is hinted by its own stock', () =>
  withServer(async ({ base, stock }) => {
    assert.equal(await stock('PEN-1'), 8, 'precondition: PEN-1 has 8 in stock');
    const page = await loadClientPage(base);
    assert.equal(quantityInput(page.itemsHtml(), 'PEN-1').max, '8');
  }));

test('REQ-ORD-12: an item exactly at the cap is hinted by the cap', () =>
  withServer(async ({ base, post, stock }) => {
    await post('/api/orders', { sku: 'MUG-1', qty: 20 });
    await post('/api/orders', { sku: 'MUG-1', qty: 7 });
    assert.equal(await stock('MUG-1'), 20, 'precondition: MUG-1 brought to exactly 20 in stock');
    const page = await loadClientPage(base);
    assert.equal(quantityInput(page.itemsHtml(), 'MUG-1').max, '20');
  }));

test("REQ-ORD-12: an out-of-stock item's hint is its own stock", () =>
  withServer(async ({ base, post, stock }) => {
    await post('/api/orders', { sku: 'PEN-1', qty: 8 });
    assert.equal(await stock('PEN-1'), 0, 'precondition: PEN-1 sold out');
    const page = await loadClientPage(base);
    const input = quantityInput(page.itemsHtml(), 'PEN-1');
    assert.equal(input.max, '0');
    // "the existing minimum and default are unaffected" — even here, where max sits below min.
    assert.equal(input.min, '1');
    assert.equal(input.value, '1');
  }));

test('REQ-ORD-12: the hint composes with search', () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.search('Pen');
    assert.equal(quantityInput(page.itemsHtml(), 'PEN-1').max, '8');
  }));

test('REQ-ORD-12: the hint composes with an order that changes stock', () =>
  withServer(async ({ base, stock }) => {
    const page = await loadClientPage(base);
    await page.order('PEN-1', 3);
    assert.equal(await stock('PEN-1'), 5, 'the order was accepted and lowered the stock');
    assert.equal(quantityInput(page.itemsHtml(), 'PEN-1').max, '5');
  }));

// REQ-ORD-13 — a zero-stock item's Order button is disabled; any stock above zero leaves it alone.
// The seed has no sold-out item, so PEN-1 (8 in stock) is sold out through real orders first.

test("REQ-ORD-13: a zero-stock item's Order button is disabled", () =>
  withServer(async ({ base, post, stock }) => {
    await post('/api/orders', { sku: 'PEN-1', qty: 8 });
    assert.equal(await stock('PEN-1'), 0, 'precondition: PEN-1 sold out');
    const page = await loadClientPage(base);
    const html = page.itemsHtml();
    assert.equal(orderButtonDisabled(html, 'PEN-1'), true, 'expected the sold-out PEN-1 Order button to be disabled');
    // "the button's accessible name is unaffected" (REQ-ORD-8) and "the quantity input is
    // unaffected" (REQ-ORD-12) — disabled or not, the card names and hints the item as before.
    assert.match(orderButtonMarkup(html, 'PEN-1'), /aria-label="[^"]*Fineliner Pen[^"]*"/);
    const input = quantityInput(html, 'PEN-1');
    assert.equal(input.min, '1');
    assert.equal(input.max, '0');
    assert.equal(input.value, '1');
  }));

test('REQ-ORD-13: an item with 1 or more in stock keeps an enabled Order button', () =>
  withServer(async ({ base, post, stock }) => {
    await post('/api/orders', { sku: 'PEN-1', qty: 7 });
    assert.equal(await stock('PEN-1'), 1, 'precondition: PEN-1 brought to exactly 1 in stock');
    assert.ok((await stock('MUG-1')) >= 20, 'precondition: MUG-1 is well stocked');
    const page = await loadClientPage(base);
    const html = page.itemsHtml();
    assert.equal(orderButtonDisabled(html, 'PEN-1'), false, 'expected the last-unit PEN-1 Order button to be enabled');
    assert.equal(orderButtonDisabled(html, 'MUG-1'), false, 'expected the well-stocked MUG-1 Order button to be enabled');
  }));

test('REQ-ORD-13: the disabled state composes with search', () =>
  withServer(async ({ base, post, stock }) => {
    await post('/api/orders', { sku: 'PEN-1', qty: 8 });
    assert.equal(await stock('PEN-1'), 0, 'precondition: PEN-1 sold out');
    const page = await loadClientPage(base);
    await page.search('Pen');
    const html = page.itemsHtml();
    assert.equal(orderButtonMarkup(html, 'MUG-1'), undefined, 'expected the search to have narrowed MUG-1 out of the list');
    assert.equal(orderButtonDisabled(html, 'PEN-1'), true, 'expected the sold-out PEN-1 Order button to stay disabled after the re-render');
  }));

test('REQ-ORD-13: an item that drops to zero stock is disabled on the next render', () =>
  withServer(async ({ base, stock }) => {
    const page = await loadClientPage(base);
    assert.equal(orderButtonDisabled(page.itemsHtml(), 'PEN-1'), false, 'precondition: PEN-1 starts enabled');
    await page.order('PEN-1', 8);
    assert.equal(await stock('PEN-1'), 0, 'the order was accepted and sold PEN-1 out');
    assert.equal(orderButtonDisabled(page.itemsHtml(), 'PEN-1'), true, 'expected the refreshed PEN-1 Order button to be disabled');
  }));

// Disabled-reason description — the button points (aria-describedby) at its card's own stock text.

/** The text a button's aria-describedby resolves to in the rendered items markup, or undefined. */
function buttonDescription(itemsHtml, sku) {
  const id = parseAttrs(orderButtonMarkup(itemsHtml, sku).match(/<button[^>]*>/)[0])['aria-describedby'];
  if (id === undefined) return undefined;
  for (const m of itemsHtml.matchAll(/<span[^>]*>([^<]*)<\/span>/g)) {
    if (parseAttrs(m[0].match(/<[^>]*>/)[0]).id === id) return decodeHtmlEntities(m[1]);
  }
  return undefined;
}

test("REQ-ORD-13: a zero-stock item's Order button is described by its stock text", () =>
  withServer(async ({ base, post, stock }) => {
    await post('/api/orders', { sku: 'PEN-1', qty: 8 });
    assert.equal(await stock('PEN-1'), 0, 'precondition: PEN-1 sold out');
    const page = await loadClientPage(base);
    assert.equal(buttonDescription(page.itemsHtml(), 'PEN-1'), '0 in stock');
  }));

test("REQ-ORD-13: the description is the stock text, not the card's whole meta line", () =>
  withServer(async ({ base, post }) => {
    await post('/api/orders', { sku: 'PEN-1', qty: 8 });
    const page = await loadClientPage(base);
    const description = buttonDescription(page.itemsHtml(), 'PEN-1');
    assert.equal(description, '0 in stock');
    assert.ok(!description.includes('PEN-1') && !description.includes('3.50'), 'no SKU or price in the reason');
  }));

test('REQ-ORD-13: an item with 1 or more in stock has no disabled-reason description', () =>
  withServer(async ({ base, post, stock }) => {
    await post('/api/orders', { sku: 'PEN-1', qty: 7 });
    assert.equal(await stock('PEN-1'), 1, 'precondition: PEN-1 at exactly 1');
    const page = await loadClientPage(base);
    const html = page.itemsHtml();
    assert.doesNotMatch(orderButtonMarkup(html, 'PEN-1'), /aria-describedby/);
    assert.doesNotMatch(orderButtonMarkup(html, 'MUG-1'), /aria-describedby/);
  }));

test("REQ-ORD-13: each out-of-stock item's description is its own stock text", () =>
  withServer(async ({ base, post, stock }) => {
    await post('/api/orders', { sku: 'PEN-1', qty: 8 });
    // MUG-1 holds 47 and one order is capped at 20 units, so three orders sell it out.
    await post('/api/orders', { sku: 'MUG-1', qty: 20 });
    await post('/api/orders', { sku: 'MUG-1', qty: 20 });
    await post('/api/orders', { sku: 'MUG-1', qty: 7 });
    assert.equal(await stock('PEN-1'), 0);
    assert.equal(await stock('MUG-1'), 0, 'precondition: two items sold out');
    const page = await loadClientPage(base);
    const html = page.itemsHtml();
    const pen = parseAttrs(orderButtonMarkup(html, 'PEN-1').match(/<button[^>]*>/)[0])['aria-describedby'];
    const mug = parseAttrs(orderButtonMarkup(html, 'MUG-1').match(/<button[^>]*>/)[0])['aria-describedby'];
    assert.ok(pen && mug && pen !== mug, 'each button points at a distinct element');
    assert.equal(buttonDescription(html, 'PEN-1'), '0 in stock');
    assert.equal(buttonDescription(html, 'MUG-1'), '0 in stock');
  }));

test('REQ-ORD-13: the description composes with search', () =>
  withServer(async ({ base, post }) => {
    await post('/api/orders', { sku: 'PEN-1', qty: 8 });
    const page = await loadClientPage(base);
    await page.search('Pen');
    const html = page.itemsHtml();
    assert.equal(orderButtonMarkup(html, 'MUG-1'), undefined, 'search narrowed MUG-1 out');
    assert.equal(buttonDescription(html, 'PEN-1'), '0 in stock');
  }));

test('REQ-ORD-13: an item that drops to zero stock gains the description on the next render', () =>
  withServer(async ({ base, stock }) => {
    const page = await loadClientPage(base);
    assert.equal(buttonDescription(page.itemsHtml(), 'PEN-1'), undefined, 'precondition: no description before');
    await page.order('PEN-1', 8);
    assert.equal(await stock('PEN-1'), 0);
    assert.equal(buttonDescription(page.itemsHtml(), 'PEN-1'), '0 in stock');
  }));

test("REQ-ORD-13, REQ-ORD-8: the description leaves the button's accessible name as \"Order {name}\"", () =>
  withServer(async ({ base, post }) => {
    await post('/api/orders', { sku: 'PEN-1', qty: 8 });
    const page = await loadClientPage(base);
    const button = orderButtonMarkup(page.itemsHtml(), 'PEN-1');
    assert.match(button, /aria-describedby=/, 'precondition: the description is present');
    assert.equal(parseAttrs(button.match(/<button[^>]*>/)[0])['aria-label'], 'Order Fineliner Pen');
  }));

// Quantity input — disabled at zero stock and described by the same stock text as the button.

/** The rendered quantity input's opening tag for a SKU. */
function quantityInputTag(itemsHtml, sku) {
  const tag = itemsHtml.match(new RegExp(`<input[^>]*\\bid="qty-${sku}"[^>]*>`))?.[0];
  assert.ok(tag, `expected a quantity input for ${sku}`);
  return tag;
}

/** Whether the quantity input is disabled — attribute presence only, quoted values stripped first. */
function quantityInputDisabled(itemsHtml, sku) {
  return /\sdisabled\b/.test(quantityInputTag(itemsHtml, sku).replace(/="[^"]*"/g, ''));
}

/** The text the quantity input's aria-describedby resolves to, or undefined. */
function inputDescription(itemsHtml, sku) {
  const id = parseAttrs(quantityInputTag(itemsHtml, sku))['aria-describedby'];
  if (id === undefined) return undefined;
  for (const m of itemsHtml.matchAll(/<span[^>]*>([^<]*)<\/span>/g)) {
    if (parseAttrs(m[0].match(/<[^>]*>/)[0]).id === id) return decodeHtmlEntities(m[1]);
  }
  return undefined;
}

test('REQ-ORD-13: a zero-stock item\'s quantity input is disabled and keeps min, max and value', () =>
  withServer(async ({ base, post, stock }) => {
    await post('/api/orders', { sku: 'PEN-1', qty: 8 });
    assert.equal(await stock('PEN-1'), 0, 'precondition: PEN-1 sold out');
    const page = await loadClientPage(base);
    const html = page.itemsHtml();
    assert.equal(quantityInputDisabled(html, 'PEN-1'), true, 'expected the sold-out PEN-1 quantity input to be disabled');
    const input = quantityInput(html, 'PEN-1');
    assert.equal(input.min, '1');
    assert.equal(input.max, '0');
    assert.equal(input.value, '1');
  }));

test("REQ-ORD-13: a zero-stock item's quantity input is described by its stock text, not its name", () =>
  withServer(async ({ base, post }) => {
    await post('/api/orders', { sku: 'PEN-1', qty: 8 });
    const page = await loadClientPage(base);
    const html = page.itemsHtml();
    const description = inputDescription(html, 'PEN-1');
    assert.equal(description, '0 in stock');
    assert.ok(!description.includes('PEN-1') && !description.includes('3.50'), 'no SKU or price in the reason');
    assert.equal(quantityInput(html, 'PEN-1')['aria-label'], 'Quantity of Fineliner Pen');
  }));

test("REQ-ORD-13: each zero-stock input is described by its own item's stock text", () =>
  withServer(async ({ base, post, stock }) => {
    await post('/api/orders', { sku: 'PEN-1', qty: 8 });
    await post('/api/orders', { sku: 'MUG-1', qty: 20 });
    await post('/api/orders', { sku: 'MUG-1', qty: 20 });
    await post('/api/orders', { sku: 'MUG-1', qty: 7 });
    assert.equal(await stock('MUG-1'), 0, 'precondition: two items sold out');
    const html = (await loadClientPage(base)).itemsHtml();
    const pen = parseAttrs(quantityInputTag(html, 'PEN-1'))['aria-describedby'];
    const mug = parseAttrs(quantityInputTag(html, 'MUG-1'))['aria-describedby'];
    assert.ok(pen && mug && pen !== mug, 'each input points at a distinct element');
    assert.equal(inputDescription(html, 'PEN-1'), '0 in stock');
    assert.equal(inputDescription(html, 'MUG-1'), '0 in stock');
  }));

test('REQ-ORD-13: an item with 1 or more in stock keeps an enabled quantity input with no description', () =>
  withServer(async ({ base, post, stock }) => {
    await post('/api/orders', { sku: 'PEN-1', qty: 7 });
    assert.equal(await stock('PEN-1'), 1, 'precondition: PEN-1 at exactly 1');
    const html = (await loadClientPage(base)).itemsHtml();
    for (const sku of ['PEN-1', 'MUG-1']) {
      assert.equal(quantityInputDisabled(html, sku), false, `expected ${sku} quantity input enabled`);
      assert.doesNotMatch(quantityInputTag(html, sku), /aria-describedby/);
    }
    assert.equal(quantityInput(html, 'MUG-1').max, '20');
    assert.equal(quantityInput(html, 'MUG-1').value, '1');
  }));

test('REQ-ORD-13, REQ-ORD-14: an in-flight order leaves the quantity input enabled', () =>
  withServer(async ({ base }) => {
    const held = inFlightFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    const ordering = page.orderButton('MUG-1').click();
    await flush();
    await page.type('mug');
    const html = page.itemsHtml();
    assert.equal(orderButtonDisabled(html, 'MUG-1'), true, 'precondition: the button is held');
    assert.equal(quantityInputDisabled(html, 'MUG-1'), false);
    assert.doesNotMatch(quantityInputTag(html, 'MUG-1'), /aria-describedby/);
    held.release();
    await ordering;
  }));

test('REQ-ORD-13: the disabled input composes with search', () =>
  withServer(async ({ base, post }) => {
    await post('/api/orders', { sku: 'PEN-1', qty: 8 });
    const page = await loadClientPage(base);
    await page.search('Pen');
    const html = page.itemsHtml();
    assert.equal(orderButtonMarkup(html, 'MUG-1'), undefined, 'search narrowed MUG-1 out');
    assert.equal(quantityInputDisabled(html, 'PEN-1'), true);
    assert.equal(inputDescription(html, 'PEN-1'), '0 in stock');
  }));

test('REQ-ORD-13: an item that drops to zero stock has its input disabled on the next render', () =>
  withServer(async ({ base, stock }) => {
    const page = await loadClientPage(base);
    assert.equal(quantityInputDisabled(page.itemsHtml(), 'PEN-1'), false, 'precondition: enabled before');
    await page.order('PEN-1', 8);
    assert.equal(await stock('PEN-1'), 0);
    const html = page.itemsHtml();
    assert.equal(quantityInputDisabled(html, 'PEN-1'), true);
    assert.equal(inputDescription(html, 'PEN-1'), '0 in stock');
  }));

// "the hint does not change what the server accepts" — a client that ignores the disabled state
// still meets REQ-ORD-2's stock check on the server. The existing REQ-ORD-2 test orders *over*
// stock; this one orders from *zero* stock, the case the hint is about.
test('REQ-ORD-13, REQ-ORD-2: an order for a zero-stock item is still rejected by the server', () =>
  withServer(async ({ post, stock }) => {
    await post('/api/orders', { sku: 'PEN-1', qty: 8 });
    assert.equal(await stock('PEN-1'), 0, 'precondition: PEN-1 sold out');
    const { status, body } = await post('/api/orders', { sku: 'PEN-1', qty: 1 });
    assert.equal(status, 422);
    assert.equal(body.reason, 'insufficient_stock');
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

test("REQ-ORD-7: a successful order's confirmation includes the ordered item's name alongside its SKU", () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.order('MUG-1', 2);
    assert.match(page.noteHtml(), /Order #\d+ placed — 2 × Enamel Mug \(MUG-1\) for £25\.00\./);
  }));

test("REQ-ORD-7: a successful order's confirmation shows a markup item name as inert text and runs no script", () =>
  withServer(async ({ base }) => {
    const hostileName = '<img src=x onerror=alert(1)>';
    const page = await loadClientPage(base, {
      fetch: (path, options) =>
        path === '/api/orders' && options?.method === 'POST'
          ? Promise.resolve({ status: 201, json: async () => ({ id: 1, sku: 'MUG-1', name: hostileName, qty: 2, total: 2500 }) })
          : fetch(base + path, options),
    });

    await page.order('MUG-1', 2); // the name sent is irrelevant; the stubbed POST always echoes hostileName
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

test('REQ-ORD-10: an ordinary order still displays correctly', async () => {
  await withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.order('MUG-1', 2);
    const html = page.getElementById('orders').innerHTML;
    assert.match(html, /#1\b/, 'the order number is shown');
    assert.match(html, /2 × Enamel Mug \(MUG-1\)/, 'the quantity, item name, and SKU, in that order');
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

test("REQ-ORD-10: markup in the order-history item's name is shown as text, not parsed, and no script runs", async () => {
  await withServer(async ({ base }) => {
    const hostile = '<img src=x onerror="alert(1)">';
    const page = await loadClientPage(base, {
      fetch: fakeOrdersFetch(base, [{ id: 1, sku: 'MUG-1', name: hostile, qty: 1, total: 1250 }]),
    });
    const html = page.getElementById('orders').innerHTML;

    assert.doesNotMatch(html, /<img/, 'the name must not become an element');
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

// REQ-ORD-7 — an order's confirmation or rejection does not outlive the search it was placed beside.

const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

/** A POST /api/orders that waits for `release()`, then answers as the real server would. */
function heldOrderFetch(base) {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const fetchImpl = async (path, options) => {
    if (path === '/api/orders' && options?.method === 'POST') await gate;
    return fetch(base + path, options);
  };
  return { fetch: fetchImpl, release: () => release() };
}

/** A POST that never reaches the server: it fails once released. */
function heldUnsentFetch(base) {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const fetchImpl = async (path, options) => {
    if (path === '/api/orders' && options?.method === 'POST') {
      await gate;
      throw new TypeError('Failed to fetch');
    }
    return fetch(base + path, options);
  };
  return { fetch: fetchImpl, release: () => release() };
}

/** Items requests can be frozen, so the test can look at the page while a search is pending. */
function freezableItemsFetch(base) {
  const state = { frozen: false, waiting: [] };
  const fetchImpl = async (path, options) => {
    if (state.frozen && path.startsWith('/api/items')) await new Promise((r) => state.waiting.push(r));
    return fetch(base + path, options);
  };
  return { fetch: fetchImpl, state, thaw: () => { state.frozen = false; state.waiting.splice(0).forEach((r) => r()); } };
}

test("REQ-ORD-7: changing the search clears an order's confirmation, before the new results arrive", () =>
  withServer(async ({ base }) => {
    const items = freezableItemsFetch(base);
    const page = await loadClientPage(base, { fetch: items.fetch });
    await page.order('MUG-1', 2);
    assert.match(page.noteHtml(), /Order #\d+ placed/);

    items.state.frozen = true;
    const typing = page.type('book');
    await flush();
    assert.equal(page.noteHtml(), '', 'emptied while the items request is still pending');
    items.thaw();
    await typing;
    assert.equal(page.noteHtml(), '');
  }));

test("REQ-ORD-7: changing the search clears an order's rejection", () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.order('MUG-1', 21);
    assert.match(page.noteHtml(), /Rejected/);
    await page.type('book');
    assert.equal(page.noteHtml(), '');
  }));

test('REQ-ORD-7: changing the search does not clear a not-sent message', () =>
  withServer(async ({ base }) => {
    let live = true;
    const page = await loadClientPage(base, {
      fetch: (path, options) => (live || path === '/' ? fetch(base + path, options) : Promise.reject(new TypeError('Failed to fetch'))),
    });
    live = false;
    await page.order('MUG-1', 1);
    assert.match(page.noteHtml(), /was not sent/i);
    await page.type('book');
    assert.match(page.noteHtml(), /was not sent/i);
  }));

test('REQ-ORD-7: whitespace that leaves the trimmed query unchanged does not clear the message', () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.type('mug');
    await page.order('MUG-1', 2);
    await page.type('mug  ');
    await page.type(' mug');
    assert.match(page.noteHtml(), /Order #\d+ placed/);
  }));

test("REQ-ORD-7: the order's own refresh does not clear its outcome", () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.type('mug');
    await page.order('MUG-1', 2);
    assert.match(page.noteHtml(), /Order #\d+ placed/);
    await page.order('MUG-1', 21);
    assert.match(page.noteHtml(), /Rejected/);
  }));

test('REQ-ORD-7: retrying the catalogue load does not clear the outcome', () =>
  withServer(async ({ base }) => {
    let itemsDown = false;
    const page = await loadClientPage(base, {
      fetch: (path, options) =>
        itemsDown && path.startsWith('/api/items') ? Promise.reject(new TypeError('Failed to fetch')) : fetch(base + path, options),
    });
    await page.order('MUG-1', 2);
    itemsDown = true;
    await page.search('');
    assert.match(page.getElementById('items').innerHTML, /Could not load the catalogue/);
    itemsDown = false;
    assert.match(page.noteHtml(), /Order #\d+ placed/);
    await page.getElementById('retry-items').click();
    assert.match(page.noteHtml(), /Order #\d+ placed/);
  }));

test("REQ-ORD-7: the page's first automatic search leaves the region empty", () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    assert.match(page.noteMarkup, LIVE_REGION);
    assert.equal(page.noteHtml(), '');
  }));

test('REQ-ORD-7: a confirmation that arrives after the query changed is not shown, and the order is still recorded', () =>
  withServer(async ({ base }) => {
    const held = heldOrderFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    await page.type('mug');
    const ordering = page.order('MUG-1', 2);
    await flush();
    await page.type('book');
    held.release();
    await ordering;
    assert.equal(page.noteHtml(), '');
    assert.match(page.getElementById('orders').innerHTML, /2 × Enamel Mug \(MUG-1\)/);
    assert.match(page.itemsHtml(), /BOOK-1/, 'the superseded refresh did not overwrite the book results');
    assert.doesNotMatch(page.itemsHtml(), /MUG-1/);
  }));

test('REQ-ORD-7: a rejection that arrives after the query changed is not shown', () =>
  withServer(async ({ base }) => {
    const held = heldOrderFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    await page.type('mug');
    const ordering = page.order('MUG-1', 21);
    await flush();
    await page.type('book');
    held.release();
    await ordering;
    assert.equal(page.noteHtml(), '');
  }));

test('REQ-ORD-7: a query that changed and changed back does not withhold the outcome', () =>
  withServer(async ({ base }) => {
    const held = heldOrderFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    await page.type('mug');
    const ordering = page.order('MUG-1', 2);
    await flush();
    await page.type('book');
    await page.type('mug');
    held.release();
    await ordering;
    assert.match(page.noteHtml(), /Order #\d+ placed/);
  }));

test('REQ-ORD-7: a withheld outcome does not replace a not-sent message', () =>
  withServer(async ({ base }) => {
    let unsent = true;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const page = await loadClientPage(base, {
      fetch: async (path, options) => {
        if (path === '/api/orders' && options?.method === 'POST') {
          if (unsent) throw new TypeError('Failed to fetch');
          await gate;
        }
        return fetch(base + path, options);
      },
    });
    await page.order('MUG-1', 1);
    assert.match(page.noteHtml(), /was not sent/i);

    unsent = false;
    const ordering = page.order('MUG-1', 2);
    await flush();
    await page.type('book');
    release();
    await ordering;
    assert.match(page.noteHtml(), /was not sent/i);
  }));

test('REQ-ORD-7: a not-sent message that arrives after the query changed is shown, and a later search does not clear it', () =>
  withServer(async ({ base }) => {
    const held = heldUnsentFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    await page.type('mug');
    const ordering = page.order('MUG-1', 1);
    await flush();
    await page.type('book');
    held.release();
    await ordering;
    assert.match(page.noteHtml(), /was not sent/i);
    await page.type('cup');
    assert.match(page.noteHtml(), /was not sent/i);
  }));

test('REQ-ORD-7: a later order after a clear is announced normally', () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.order('MUG-1', 2);
    await page.type('book');
    assert.equal(page.noteHtml(), '');
    await page.order('BOOK-1', 1);
    assert.match(page.noteHtml(), /Order #\d+ placed/);
  }));

// REQ-ORD-7 / REQ-ORD-9 — the outcome is announced only while the trimmed field is unchanged.

/** The shopper changing the maximum price, through the page's own input listener. */
async function setMaxPrice(page, value) {
  page.getElementById('max-price').value = value;
  await page.getElementById('max-price').listeners.input();
}

test('REQ-ORD-7: the query is the field at the click, not the results still showing', () =>
  withServer(async ({ base }) => {
    const items = freezableItemsFetch(base);
    const page = await loadClientPage(base, { fetch: items.fetch });
    items.state.frozen = true;
    const typing = page.type('mugs'); // the search has not returned; the cards show the old results
    await flush();
    const ordering = page.order('MUG-1', 2);
    await flush();
    assert.match(page.noteHtml(), /Order #\d+ placed/);
    items.thaw();
    await Promise.all([typing, ordering]);
  }));

test('REQ-ORD-7: a withheld rejection adds no entry to the reloaded history, and the cards stay as they were', () =>
  withServer(async ({ base }) => {
    const held = heldOrderFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    await page.type('mug');
    const ordering = page.order('MUG-1', 21);
    await flush();
    await page.type('book');
    held.release();
    await ordering;
    assert.equal(page.noteHtml(), '');
    assert.match(page.getElementById('orders').innerHTML, /No orders yet/);
    assert.match(page.itemsHtml(), /BOOK-1/);
    assert.doesNotMatch(page.itemsHtml(), /MUG-1/);
  }));

test('REQ-ORD-7: changing the maximum price does not clear a showing outcome', () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.order('MUG-1', 2);
    await setMaxPrice(page, '50');
    assert.match(page.noteHtml(), /Order #\d+ placed/);
    await page.order('MUG-1', 21);
    await setMaxPrice(page, '60');
    assert.match(page.noteHtml(), /Rejected/);
  }));

test('REQ-ORD-7: changing the maximum price does not withhold an in-flight outcome', () =>
  withServer(async ({ base }) => {
    const held = heldOrderFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    const ordering = page.order('MUG-1', 2);
    await flush();
    await setMaxPrice(page, '50');
    held.release();
    await ordering;
    assert.match(page.noteHtml(), /Order #\d+ placed/);
  }));

test('REQ-ORD-7: a matching late outcome replaces whatever the region holds', () =>
  withServer(async ({ base }) => {
    let holdFirst = true;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const page = await loadClientPage(base, {
      fetch: async (path, options) => {
        if (path === '/api/orders' && options?.method === 'POST' && holdFirst) {
          holdFirst = false;
          await gate;
        }
        return fetch(base + path, options);
      },
    });
    await page.type('mug');
    const first = page.order('MUG-1', 2);
    await flush();
    await page.type('book');
    await page.order('BOOK-1', 1);
    assert.match(page.noteHtml(), /1 × .*\(BOOK-1\)/);
    await page.type('mug');
    release();
    await first;
    assert.match(page.noteHtml(), /2 × Enamel Mug \(MUG-1\)/);
  }));

test('REQ-ORD-7: a not-sent message survives further searches until another order outcome replaces it', () =>
  withServer(async ({ base }) => {
    let live = false;
    const page = await loadClientPage(base, {
      fetch: (path, options) =>
        live || !(path === '/api/orders' && options?.method === 'POST') ? fetch(base + path, options) : Promise.reject(new TypeError('Failed to fetch')),
    });
    await page.order('MUG-1', 1);
    await page.type('book');
    await page.type('cup');
    assert.match(page.noteHtml(), /was not sent/i);
    live = true;
    await page.order('MUG-1', 2);
    assert.match(page.noteHtml(), /Order #\d+ placed/);
  }));

test('REQ-ORD-9: a rejection is written into the live region when shown, and one that arrives after the field changed is not shown', () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.order('MUG-1', 21);
    assert.match(page.noteHtml(), /Rejected — no more than 20 units per order/);

    const held = heldOrderFetch(base);
    const late = await loadClientPage(base, { fetch: held.fetch });
    await late.type('mug');
    const ordering = late.order('MUG-1', 21);
    await flush();
    await late.type('book');
    held.release();
    await ordering;
    assert.equal(late.noteHtml(), '');
  }));

// REQ-ORD-14 — an item's Order button is unavailable while its order is in flight.

/**
 * A fetch whose order POST waits for `release()` and then either reaches the server or fails
 * as not-sent, and whose item requests can be frozen — so a test can look at the page in the
 * moment the outcome is known but the post-order refresh has not arrived. Every POST body is kept.
 */
function inFlightFetch(base, { unsent = false, itemsOverride } = {}) {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const state = { posts: [], frozen: false, waiting: [], itemsOverride };
  const fetchImpl = async (path, options) => {
    if (path === '/api/orders' && options?.method === 'POST') {
      state.posts.push(JSON.parse(options.body));
      await gate;
      if (unsent) throw new TypeError('Failed to fetch');
    }
    if (path.startsWith('/api/items')) {
      if (state.frozen) await new Promise((r) => state.waiting.push(r));
      if (state.itemsOverride) return { status: 200, json: async () => state.itemsOverride };
    }
    return fetch(base + path, options);
  };
  return {
    fetch: fetchImpl,
    state,
    release: () => release(),
    thaw: () => { state.frozen = false; state.waiting.splice(0).forEach((r) => r()); },
  };
}

test('REQ-ORD-14: a second click while the order is pending places no second order', () =>
  withServer(async ({ base, get, stock }) => {
    const held = inFlightFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    const before = await stock('MUG-1');
    page.getElementById('qty-MUG-1').value = '3';
    const first = page.orderButton('MUG-1').click();
    await flush();
    const second = page.orderButton('MUG-1').click(); // a second click, or a second Enter or Space, is this click
    await flush();
    held.release();
    await Promise.all([first, second]);
    assert.equal(held.state.posts.length, 1, 'exactly one POST /api/orders');
    const { body: orders } = await get('/api/orders');
    assert.equal(orders.length, 1);
    assert.equal(await stock('MUG-1'), before - 3);
  }));

test('REQ-ORD-14: the button is disabled with the native attribute while the order is pending', () =>
  withServer(async ({ base }) => {
    const held = inFlightFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    assert.equal(page.orderButton('MUG-1').disabled, false);
    const ordering = page.orderButton('MUG-1').click();
    await flush();
    assert.equal(page.orderButton('MUG-1').disabled, true);
    assert.ok('disabled' in page.orderButton('MUG-1').attrs);
    held.release();
    await ordering;
  }));

/** Place MUG-1 or PEN-1, hold the refresh, release the outcome, and look at the button then. */
async function buttonWhenOutcomeKnown(base, held, page, { sku = 'MUG-1', qty = 2, before } = {}) {
  page.getElementById(`qty-${sku}`).value = String(qty);
  const ordering = page.orderButton(sku).click();
  await flush();
  assert.equal(page.orderButton(sku).disabled, true, 'held while pending');
  await before?.();
  held.state.frozen = true; // the refresh that follows the outcome is still on its way
  held.release();
  await flush();
  const enabled = !page.orderButton(sku).disabled;
  held.thaw();
  await ordering;
  return enabled;
}

test('REQ-ORD-14: the button is enabled again at a confirmation, before the refresh arrives', () =>
  withServer(async ({ base }) => {
    const held = inFlightFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    assert.equal(await buttonWhenOutcomeKnown(base, held, page), true);
    assert.match(page.noteHtml(), /Order #\d+ placed/);
  }));

test('REQ-ORD-14: the button is enabled again at a rejection, before the refresh arrives', () =>
  withServer(async ({ base }) => {
    const held = inFlightFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    assert.equal(await buttonWhenOutcomeKnown(base, held, page, { qty: 21 }), true);
    assert.match(page.noteHtml(), /Rejected/);
  }));

test('REQ-ORD-14: the button is enabled again at a not-sent outcome, before the refresh arrives', () =>
  withServer(async ({ base }) => {
    const held = inFlightFetch(base, { unsent: true });
    const page = await loadClientPage(base, { fetch: held.fetch });
    assert.equal(await buttonWhenOutcomeKnown(base, held, page), true);
    assert.match(page.noteHtml(), /was not sent/i);
  }));

test('REQ-ORD-14: the button is enabled again at a withheld outcome, before the refresh arrives', () =>
  withServer(async ({ base }) => {
    const held = inFlightFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    await page.type('mug');
    const enabled = await buttonWhenOutcomeKnown(base, held, page, { before: () => page.type('enamel') });
    assert.equal(enabled, true);
    assert.equal(page.noteHtml(), '', 'withheld: no outcome message');
  }));

test('REQ-ORD-14, REQ-ORD-13: a card then showing 0 in stock stays disabled when the outcome is known', () =>
  withServer(async ({ base }) => {
    const soldOut = [{ sku: 'PEN-1', name: 'Fineliner Pen', price: 350, stock: 0 }];
    const held = inFlightFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    const enabled = await buttonWhenOutcomeKnown(base, held, page, {
      sku: 'PEN-1',
      qty: 8,
      before: async () => { held.state.itemsOverride = soldOut; await page.type('pen'); },
    });
    assert.equal(enabled, false);
    assert.equal(orderButtonDisabled(page.itemsHtml(), 'PEN-1'), true);
  }));

test('REQ-ORD-14: only the ordered item is held, and another item can be ordered meanwhile', () =>
  withServer(async ({ base, get }) => {
    const held = inFlightFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    const first = page.orderButton('MUG-1').click();
    await flush();
    assert.equal(page.orderButton('MUG-1').disabled, true);
    assert.equal(page.orderButton('BOOK-1').disabled, false);
    const second = page.orderButton('BOOK-1').click();
    await flush();
    assert.deepEqual(held.state.posts.map((p) => p.sku), ['MUG-1', 'BOOK-1']);
    held.release();
    await Promise.all([first, second]);
    assert.equal((await get('/api/orders')).body.length, 2);
  }));

test('REQ-ORD-14: the hold survives a re-render of the list', () =>
  withServer(async ({ base }) => {
    const held = inFlightFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    const ordering = page.orderButton('MUG-1').click();
    await flush();
    await page.type('mug');
    assert.equal(orderButtonDisabled(page.itemsHtml(), 'MUG-1'), true);
    assert.equal(page.orderButton('MUG-1').disabled, true);
    held.release();
    await ordering;
    assert.equal(page.orderButton('MUG-1').disabled, false, 'enabled again once the outcome is known');
  }));

test('REQ-ORD-14: the hold survives the item leaving the list and coming back', () =>
  withServer(async ({ base }) => {
    const held = inFlightFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    const ordering = page.orderButton('MUG-1').click();
    await flush();
    await page.type('book');
    assert.doesNotMatch(page.itemsHtml(), /MUG-1/);
    await page.type('mug');
    assert.equal(orderButtonDisabled(page.itemsHtml(), 'MUG-1'), true);
    held.release();
    await ordering;
  }));

test('REQ-ORD-14: the hold survives a load failure and its retry', () =>
  withServer(async ({ base }) => {
    const held = inFlightFetch(base);
    let failItems = false;
    const page = await loadClientPage(base, {
      fetch: (path, options) =>
        failItems && path.startsWith('/api/items') ? Promise.reject(new TypeError('Failed to fetch')) : held.fetch(path, options),
    });
    const ordering = page.orderButton('MUG-1').click();
    await flush();
    failItems = true;
    await page.type('mug');
    assert.match(page.itemsHtml(), /Could not load the catalogue/);
    failItems = false;
    page.getElementById('retry-items').click();
    await flush();
    assert.equal(orderButtonDisabled(page.itemsHtml(), 'MUG-1'), true);
    held.release();
    await ordering;
  }));

test('REQ-ORD-14, REQ-ORD-13: an in-flight button carries no stock description, and name, label and quantity input are unchanged', () =>
  withServer(async ({ base }) => {
    const held = inFlightFetch(base);
    const page = await loadClientPage(base, { fetch: held.fetch });
    const inputBefore = quantityInput(page.itemsHtml(), 'MUG-1');
    const ordering = page.orderButton('MUG-1').click();
    await flush();
    await page.type('mug'); // a fresh render while the order is pending
    const html = page.itemsHtml();
    const button = orderButtonMarkup(html, 'MUG-1');
    assert.equal(orderButtonDisabled(html, 'MUG-1'), true);
    assert.doesNotMatch(button, /aria-describedby/);
    assert.match(button, /aria-label="Order Enamel Mug"/);
    assert.match(button, />Order<\/button>$/);
    assert.deepEqual(quantityInput(html, 'MUG-1'), inputBefore);
    assert.equal(page.orderButton('MUG-1').attrs['aria-describedby'], undefined);
    held.release();
    await ordering;
  }));

test('REQ-ORD-14, REQ-ORD-13: a zero-stock button still carries "0 in stock"', () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.order('PEN-1', 8);
    const button = orderButtonMarkup(page.itemsHtml(), 'PEN-1');
    assert.match(button, /aria-describedby="stock-PEN-1"/);
    assert.match(page.itemsHtml(), /<span id="stock-PEN-1">0 in stock<\/span>/);
  }));

test('REQ-ORD-14: the server still accepts two sequential valid orders for the same item', () =>
  withServer(async ({ post, get, stock }) => {
    const before = await stock('MUG-1');
    assert.equal((await post('/api/orders', { sku: 'MUG-1', qty: 2 })).status, 201);
    assert.equal((await post('/api/orders', { sku: 'MUG-1', qty: 2 })).status, 201);
    assert.equal((await get('/api/orders')).body.length, 2);
    assert.equal(await stock('MUG-1'), before - 4);
  }));

// REQ-ORD-15 — keyboard focus stays on the ordered item after the list refreshes.
// The page runs against a stub DOM that models focus the way a browser does: a disabled control
// refuses it, a card takes it only with a tabindex, and replaced or newly disabled controls drop
// it to the page body. Each test settles every request it starts, so none can hang.

const ORDER_FOCUS = 'REQ-ORD-15';

test(`${ORDER_FOCUS}: focus returns to the Order button after a confirmed order`, () =>
  withServer(async ({ base, stock }) => {
    const page = await loadClientPage(base);
    page.focusOn(page.orderButton('MUG-1'));
    await page.orderButton('MUG-1').click();
    assert.equal(await stock('MUG-1'), 46, 'precondition: the order was accepted');
    assert.equal(page.active(), page.orderButton('MUG-1'));
    assert.ok(page.active().attrs['data-sku'], 'a button of the refreshed list');
  }));

test(`${ORDER_FOCUS}: focus returns after a rejected order`, () =>
  withServer(async ({ base, stock }) => {
    const page = await loadClientPage(base);
    page.quantityField('MUG-1').value = '21';
    page.focusOn(page.orderButton('MUG-1'));
    await page.orderButton('MUG-1').click();
    assert.equal(await stock('MUG-1'), 47, 'precondition: the order was rejected');
    assert.equal(page.active(), page.orderButton('MUG-1'));
  }));

test(`${ORDER_FOCUS}: focus returns after an order that was not sent`, () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base, { fetch: gatedFetch(base, { offline: true }) });
    page.focusOn(page.orderButton('MUG-1'));
    await page.orderButton('MUG-1').click();
    assert.match(page.noteHtml(), /not sent/);
    assert.equal(page.active(), page.orderButton('MUG-1'));
  }));

test(`${ORDER_FOCUS}: it is the ordered item's button, not another's`, () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    page.focusOn(page.orderButton('BOOK-1'));
    await page.orderButton('BOOK-1').click();
    assert.equal(page.active(), page.orderButton('BOOK-1'));
    assert.notEqual(page.active(), page.orderButton('MUG-1'));
  }));

test(`${ORDER_FOCUS}: an item that drops to zero stock gives focus to its card`, () =>
  withServer(async ({ base, stock }) => {
    const page = await loadClientPage(base);
    page.quantityField('PEN-1').value = '8';
    page.focusOn(page.orderButton('PEN-1'));
    await page.orderButton('PEN-1').click();
    assert.equal(await stock('PEN-1'), 0, 'precondition: sold out');
    assert.equal(page.orderButton('PEN-1').disabled, true);
    assert.equal(page.quantityField('PEN-1').disabled, true);
    assert.equal(page.active(), page.card('PEN-1'));
    assert.notEqual(page.active(), page.orderButton('PEN-1'));
    assert.notEqual(page.active().tagName, 'BODY');
  }));

test(`${ORDER_FOCUS}: focus left on another item's enabled quantity input stays on its replacement`, () =>
  withServer(async ({ base }) => {
    const fetchImpl = gatedFetch(base);
    const page = await loadClientPage(base, { fetch: fetchImpl });
    const release = fetchImpl.hold('GET /api/items');
    page.focusOn(page.orderButton('MUG-1'));
    const ordering = page.orderButton('MUG-1').click();
    await until(() => !page.orderButton('MUG-1').disabled, 'the outcome');
    const before = page.quantityField('BOOK-1');
    page.focusOn(before);
    release();
    await ordering;
    assert.notEqual(page.quantityField('BOOK-1'), before, 'precondition: the refresh replaced the input');
    assert.equal(page.active(), page.quantityField('BOOK-1'));
  }));

test(`${ORDER_FOCUS}: focus moved to another item's Order button follows it through the refresh`, () =>
  withServer(async ({ base }) => {
    const fetchImpl = gatedFetch(base);
    const page = await loadClientPage(base, { fetch: fetchImpl });
    const release = fetchImpl.hold('GET /api/items');
    page.focusOn(page.orderButton('MUG-1'));
    const ordering = page.orderButton('MUG-1').click();
    await until(() => !page.orderButton('MUG-1').disabled, 'the outcome');
    page.focusOn(page.orderButton('BOOK-1'));
    release();
    await ordering;
    assert.equal(page.active(), page.orderButton('BOOK-1'));
  }));

test(`${ORDER_FOCUS}: another item's control that is disabled at zero stock gives focus to its card`, () =>
  withServer(async ({ base, post }) => {
    const fetchImpl = gatedFetch(base);
    const page = await loadClientPage(base, { fetch: fetchImpl });
    const release = fetchImpl.hold('GET /api/items');
    page.focusOn(page.orderButton('MUG-1'));
    const ordering = page.orderButton('MUG-1').click();
    await until(() => !page.orderButton('MUG-1').disabled, 'the outcome');
    page.focusOn(page.orderButton('PEN-1'));
    await post('/api/orders', { sku: 'PEN-1', qty: 8 }); // sold out elsewhere before the list is drawn
    release();
    await ordering;
    assert.equal(page.orderButton('PEN-1').disabled, true);
    assert.equal(page.quantityField('PEN-1').disabled, true);
    assert.equal(page.active(), page.card('PEN-1'));
  }));

test(`${ORDER_FOCUS}: a disabled quantity input gives focus to its card`, () =>
  withServer(async ({ base, post }) => {
    const fetchImpl = gatedFetch(base);
    const page = await loadClientPage(base, { fetch: fetchImpl });
    const release = fetchImpl.hold('GET /api/items');
    page.focusOn(page.orderButton('MUG-1'));
    const ordering = page.orderButton('MUG-1').click();
    await until(() => !page.orderButton('MUG-1').disabled, 'the outcome');
    page.focusOn(page.quantityField('PEN-1'));
    await post('/api/orders', { sku: 'PEN-1', qty: 8 });
    release();
    await ordering;
    assert.equal(page.quantityField('PEN-1').disabled, true);
    assert.equal(page.active(), page.card('PEN-1'));
  }));

test(`${ORDER_FOCUS}: the card can take focus and is not a tab stop`, () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    const stops = page.tabStops();
    assert.ok(!stops.includes(page.card('MUG-1')), 'tabbing does not land on a card');
    assert.equal(page.card('MUG-1').attrs.tabindex, '-1', 'a card that can take focus without joining the Tab order');
    for (const sku of ['MUG-1', 'BOOK-1', 'PEN-1']) {
      assert.ok(stops.includes(page.quantityField(sku)), `tabbing lands on ${sku}'s quantity input`);
      assert.ok(stops.includes(page.orderButton(sku)), `tabbing lands on ${sku}'s Order button`);
    }
    page.focusOn(page.card('MUG-1'));
  }));

test(`${ORDER_FOCUS}: focus on another control that is not in the list is left alone`, () =>
  withServer(async ({ base }) => {
    const fetchImpl = gatedFetch(base);
    const page = await loadClientPage(base, { fetch: fetchImpl });
    const release = fetchImpl.hold('GET /api/items');
    page.focusOn(page.orderButton('MUG-1'));
    const ordering = page.orderButton('MUG-1').click();
    await until(() => !page.orderButton('MUG-1').disabled, 'the outcome');
    const link = page.control('A');
    page.focusOn(link);
    release();
    await ordering;
    assert.equal(page.active(), link);
  }));

test(`${ORDER_FOCUS}: focus on no control is restored to the ordered item`, () =>
  withServer(async ({ base }) => {
    const fetchImpl = gatedFetch(base);
    const page = await loadClientPage(base, { fetch: fetchImpl });
    const release = fetchImpl.hold('GET /api/items');
    page.focusOn(page.orderButton('BOOK-1'));
    const ordering = page.orderButton('BOOK-1').click();
    await until(() => !page.orderButton('BOOK-1').disabled, 'the outcome');
    page.blur(); // the shopper clicked blank page space
    release();
    await ordering;
    assert.equal(page.active(), page.orderButton('BOOK-1'));
  }));

test(`${ORDER_FOCUS}: overlapping orders restore focus to the most recently operated item`, () =>
  withServer(async ({ base }) => {
    const fetchImpl = gatedFetch(base);
    const page = await loadClientPage(base, { fetch: fetchImpl });
    const releaseA = fetchImpl.hold('GET /api/items');
    page.focusOn(page.orderButton('MUG-1'));
    const orderA = page.orderButton('MUG-1').click();
    await until(() => !page.orderButton('MUG-1').disabled, "A's outcome");
    const releaseB = fetchImpl.hold('POST /api/orders');
    page.focusOn(page.orderButton('BOOK-1'));
    const orderB = page.orderButton('BOOK-1').click(); // B's newer request supersedes A's refresh
    assert.equal(page.active().tagName, 'BODY', 'precondition: B\'s button was disabled, so nothing has focus');
    releaseA();
    await orderA;
    assert.notEqual(page.active(), page.orderButton('MUG-1'), "A's discarded refresh moved nothing onto A");
    assert.equal(page.active().tagName, 'BODY', "A's discarded refresh moved nothing at all");
    releaseB();
    await orderB;
    assert.equal(page.active().card, page.card('BOOK-1'), "B's refresh restores focus to item B");
  }));

test(`${ORDER_FOCUS}: focus on an item card stays on that card`, () =>
  withServer(async ({ base }) => {
    const fetchImpl = gatedFetch(base);
    const page = await loadClientPage(base, { fetch: fetchImpl });
    const release = fetchImpl.hold('GET /api/items');
    page.focusOn(page.orderButton('MUG-1'));
    const ordering = page.orderButton('MUG-1').click();
    await until(() => !page.orderButton('MUG-1').disabled, 'the outcome');
    page.focusOn(page.card('BOOK-1'));
    release();
    await ordering;
    assert.equal(page.active(), page.card('BOOK-1'));
  }));

test(`${ORDER_FOCUS}: a later pointer-only order does not take the fallback`, () =>
  withServer(async ({ base }) => {
    const fetchImpl = gatedFetch(base);
    const page = await loadClientPage(base, { fetch: fetchImpl });
    const releaseA = fetchImpl.hold('GET /api/items');
    page.focusOn(page.orderButton('MUG-1'));
    const orderA = page.orderButton('MUG-1').click();
    await until(() => !page.orderButton('MUG-1').disabled, "A's outcome");
    page.blur();
    const orderB = page.orderButton('BOOK-1').click(); // a pointer that did not focus the button
    releaseA();
    await Promise.all([orderA, orderB]);
    assert.equal(page.active(), page.orderButton('MUG-1'));
    assert.notEqual(page.active().card, page.card('BOOK-1'));
  }));

test(`${ORDER_FOCUS}: a click that did not focus the button restores nothing`, () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    await page.orderButton('BOOK-1').click();
    assert.equal(page.active().tagName, 'BODY');
  }));

test(`${ORDER_FOCUS}: a stale refresh moves nothing`, () =>
  withServer(async ({ base }) => {
    const fetchImpl = gatedFetch(base);
    const page = await loadClientPage(base, { fetch: fetchImpl });
    const release = fetchImpl.hold('GET /api/items');
    page.focusOn(page.orderButton('MUG-1'));
    const ordering = page.orderButton('MUG-1').click();
    await until(() => !page.orderButton('MUG-1').disabled, 'the outcome');
    page.blur();
    await page.type('pen'); // a newer item-list request
    release();
    await ordering;
    assert.equal(page.active().tagName, 'BODY');
  }));

test(`${ORDER_FOCUS}: a withheld outcome's discarded refresh moves nothing`, () =>
  withServer(async ({ base }) => {
    const fetchImpl = gatedFetch(base);
    const page = await loadClientPage(base, { fetch: fetchImpl });
    const release = fetchImpl.hold('POST /api/orders');
    page.focusOn(page.orderButton('MUG-1'));
    const ordering = page.orderButton('MUG-1').click();
    await page.type('pen');
    release();
    await ordering;
    assert.equal(page.noteHtml(), '', 'precondition: the outcome was withheld');
    assert.equal(page.active().tagName, 'BODY');
  }));

test(`${ORDER_FOCUS}: a query that changes and changes back leaves focus where the shopper put it`, () =>
  withServer(async ({ base }) => {
    const fetchImpl = gatedFetch(base);
    const page = await loadClientPage(base, { fetch: fetchImpl });
    const release = fetchImpl.hold('POST /api/orders');
    page.focusOn(page.orderButton('MUG-1'));
    const ordering = page.orderButton('MUG-1').click();
    const search = page.getElementById('q');
    page.focusOn(search);
    await page.type('pen');
    await page.type('');
    release();
    await ordering;
    assert.match(page.noteHtml(), /placed/, 'precondition: the outcome is shown');
    assert.equal(page.active(), search);
  }));

test(`${ORDER_FOCUS}: a SKU containing markup characters is still found`, () =>
  withServer(async ({ base }) => {
    const items = [
      { sku: 'A"&<b>\'x', name: 'Odd', price: 100, stock: 5 },
      { sku: 'B-1', name: 'Plain', price: 100, stock: 5 },
    ];
    const page = await loadClientPage(base, { fetch: fakeItemsFetch(base, items) });
    page.focusOn(page.orderButton('A"&<b>\'x'));
    await page.orderButton('A"&<b>\'x').click();
    assert.equal(page.active(), page.orderButton('A"&<b>\'x'));
  }));

test(`${ORDER_FOCUS}: no card for the item, or no list, requires nothing`, () =>
  withServer(async ({ base }) => {
    for (const refresh of [
      { status: 200, json: async () => [{ sku: 'BOOK-1', name: 'Pocket Notebook', price: 800, stock: 5 }] },
      null, // the list cannot be loaded
    ]) {
      let after = false;
      const fetchImpl = (path, options) => {
        if (after && path.startsWith('/api/items')) return refresh ? Promise.resolve(refresh) : Promise.reject(new Error('down'));
        return fetch(base + path, options);
      };
      const page = await loadClientPage(base, { fetch: fetchImpl });
      page.focusOn(page.orderButton('MUG-1'));
      after = true;
      await page.orderButton('MUG-1').click();
      assert.equal(page.active().tagName, 'BODY');
      assert.notEqual(page.active(), page.getElementById('note'));
    }
  }));

test(`${ORDER_FOCUS}: the outcome is still announced and focus does not follow it`, () =>
  withServer(async ({ base }) => {
    const page = await loadClientPage(base);
    page.focusOn(page.orderButton('MUG-1'));
    await page.orderButton('MUG-1').click();
    assert.match(page.noteHtml(), /Order #\d+ placed/);
    assert.match(page.noteMarkup, /role="status"/);
    assert.equal(page.active(), page.orderButton('MUG-1'));
    assert.notEqual(page.active(), page.getElementById('note'));
  }));
