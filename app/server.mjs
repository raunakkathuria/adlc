// A tiny storefront — items and orders, in memory, zero dependencies.
//
// Behaviour is specified in openspec/specs/catalog/spec.md and openspec/specs/orders/spec.md. The spec is the source of truth:
// if this file and the spec disagree, THIS FILE IS WRONG.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

export const MAX_UNITS_PER_ORDER = 20;
export const BULK_QTY = 10;
export const BULK_DISCOUNT_PERCENT = 10;

// price is an integer in minor units (cents). Never a float — see AGENTS.md.
const SEED = [
  { sku: 'MUG-1', name: 'Enamel Mug', price: 1250, stock: 47 },
  { sku: 'BOOK-1', name: 'Pocket Notebook', price: 800, stock: 120 },
  { sku: 'PEN-1', name: 'Fineliner Pen', price: 350, stock: 8 },
];

let items;
let orders;
let nextOrderId;

/** Restore the catalog and orders to their seeded state. Tests call this between cases. */
export function reset() {
  items = new Map(SEED.map((item) => [item.sku, { ...item }]));
  orders = [];
  nextOrderId = 1;
}
reset();

// --- domain ------------------------------------------------------------------

export function listItems(query, maxPrice) {
  let result = [...items.values()];
  if (query) result = result.filter((item) => item.name.includes(query));
  if (maxPrice !== undefined) result = result.filter((item) => item.price <= maxPrice);
  return result;
}

export function getItem(sku) {
  return items.get(sku) ?? null;
}

export function orderTotal(price, qty) {
  const gross = price * qty;
  if (qty < BULK_QTY) return gross;
  return gross - Math.floor((gross * BULK_DISCOUNT_PERCENT) / 100);
}

export function createOrder(sku, qty) {
  const item = items.get(sku);
  if (!item) return { ok: false, reason: 'unknown_sku' };
  if (!Number.isInteger(qty) || qty < 1) return { ok: false, reason: 'invalid_qty' };
  if (qty > item.stock) return { ok: false, reason: 'insufficient_stock' };

  item.stock -= qty; // reserve the units

  if (qty > MAX_UNITS_PER_ORDER) return { ok: false, reason: 'over_limit' };

  const order = { id: nextOrderId++, sku, qty, total: orderTotal(item.price, qty) };
  orders.push(order);
  return { ok: true, order };
}

export function listOrders() {
  return orders;
}

// --- http --------------------------------------------------------------------

const REJECT_STATUS = {
  unknown_sku: 404,
  invalid_qty: 400,
  insufficient_stock: 422,
  over_limit: 422,
};

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createApp() {
  return createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const path = url.pathname;

    try {
      if (req.method === 'GET' && path === '/api/items') {
        const maxPriceValues = url.searchParams.getAll('max_price');
        if (maxPriceValues.length > 1 || (maxPriceValues.length === 1 && !/^\d+$/.test(maxPriceValues[0]))) {
          return json(res, 400, { reason: 'invalid_max_price' });
        }
        const maxPrice = maxPriceValues.length === 1 ? Number(maxPriceValues[0]) : undefined;
        return json(res, 200, listItems(url.searchParams.get('q'), maxPrice));
      }

      if (req.method === 'GET' && path.startsWith('/api/items/')) {
        const sku = decodeURIComponent(path.slice('/api/items/'.length));
        const item = getItem(sku);
        return item ? json(res, 200, item) : json(res, 404, { reason: 'unknown_sku' });
      }

      if (req.method === 'GET' && path === '/api/orders') {
        return json(res, 200, listOrders());
      }

      if (req.method === 'POST' && path === '/api/orders') {
        const body = await readJsonBody(req);
        const result = createOrder(body?.sku, body?.qty);
        return result.ok
          ? json(res, 201, result.order)
          : json(res, REJECT_STATUS[result.reason] ?? 422, { reason: result.reason });
      }

      if (req.method === 'GET' && (path === '/' || path === '/index.html')) {
        const html = await readFile(join(HERE, 'index.html'));
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(html);
      }

      json(res, 404, { reason: 'not_found' });
    } catch (err) {
      json(res, 400, { reason: 'bad_request', detail: err.message });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => {
    console.log(`storefront listening on http://localhost:${port}`);
  });
}
