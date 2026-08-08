// Test helpers. Every test talks to the app over HTTP, the way a user's browser does — so a
// reproduction test exercises the same path as the bug report it came from.

import { createApp, reset } from '../app/server.mjs';

/**
 * Start the app on a free port, hand the test a client, then shut it down.
 * The catalog is reset to its seeded state first, so tests don't leak stock into each other.
 */
export async function withServer(run) {
  reset();
  const server = createApp();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const get = async (path) => {
    const res = await fetch(base + path);
    return { status: res.status, body: await res.json() };
  };

  const post = async (path, body) => {
    const res = await fetch(base + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };

  /** Current stock for a SKU, read back through the API. */
  const stock = async (sku) => (await get(`/api/items/${sku}`)).body.stock;

  try {
    await run({ base, get, post, stock });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
