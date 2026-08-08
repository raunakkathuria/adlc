The bug is real and reproduced. Three tests, all naming `REQ-ORD-4`, added to `test/orders.test.js:56-119`.

## The tests

```js
// The report in issues/001: the catalog showed 47 mugs, an order for 25 was correctly rejected
// over the 20-unit cap, and the catalog then showed 22. Nothing was sold, but 25 units were gone.
test('REQ-ORD-4: an over-limit rejection leaves stock and order history untouched', () =>
  withServer(async ({ post, get, stock }) => {
    const before = await stock('MUG-1');

    const first = await post('/api/orders', { sku: 'MUG-1', qty: 25 });
    assert.equal(first.status, 422);
    assert.equal(first.body.reason, 'over_limit');
    assert.equal(await stock('MUG-1'), before);

    // The same request again must be judged the same way — REQ-ORD-3 caps units "regardless of
    // stock", so a rejection that quietly ate stock would change the verdict on the retry.
    const second = await post('/api/orders', { sku: 'MUG-1', qty: 25 });
    assert.equal(second.status, 422);
    assert.equal(second.body.reason, 'over_limit');
    assert.equal(await stock('MUG-1'), before);

    const { body: orders } = await get('/api/orders');
    assert.deepEqual(orders, []);
  }));

// REQ-ORD-4 holds for *every* rejection reason, so pin the invariant where the spec states it
// rather than only on the path the reporter happened to walk.
test('REQ-ORD-4: every rejection reason leaves the catalog and orders unchanged', () =>
  withServer(async ({ post, get }) => {
    const rejections = [
      { order: { sku: 'NOPE-9', qty: 1 }, status: 404, reason: 'unknown_sku' },
      { order: { sku: 'MUG-1', qty: 0 }, status: 400, reason: 'invalid_qty' },
      { order: { sku: 'PEN-1', qty: 12 }, status: 422, reason: 'insufficient_stock' },
      { order: { sku: 'MUG-1', qty: 25 }, status: 422, reason: 'over_limit' },
    ];

    for (const { order, status, reason } of rejections) {
      const { body: before } = await get('/api/items');

      const res = await post('/api/orders', order);
      assert.equal(res.status, status, reason);
      assert.equal(res.body.reason, reason);

      const { body: after } = await get('/api/items');
      assert.deepEqual(after, before, `catalog changed after a ${reason} rejection`);

      const { body: orders } = await get('/api/orders');
      assert.deepEqual(orders, [], `an order was recorded after a ${reason} rejection`);
    }
  }));

// Stock lost to a rejection is not cosmetic: it is the number the next order is judged against.
test('REQ-ORD-4: stock consumed by a rejection must not starve a later valid order', () =>
  withServer(async ({ post, stock }) => {
    const before = await stock('MUG-1');

    for (let attempt = 1; attempt <= 2; attempt++) {
      const { status } = await post('/api/orders', { sku: 'MUG-1', qty: 21 });
      assert.equal(status, 422, `attempt ${attempt}`);
    }

    // 47 mugs are still on the shelf, so 20 of them are still sellable.
    const onShelf = await stock('MUG-1');
    const { status, body } = await post('/api/orders', { sku: 'MUG-1', qty: 20 });
    assert.equal(status, 201, `rejected orders left only ${onShelf} in stock`);
    assert.equal(body.total, 22500);
    assert.equal(await stock('MUG-1'), before - 20);
  }));
```

The first mirrors the report exactly (47 → order 25 → rejected → still 47). The second pins the invariant at the level `spec/orders.md` states it — *every* rejection reason, whole-catalog snapshot — so the guard survives a patch that special-cases `over_limit`. The third asserts the damage the reporter didn't notice: units eaten by a rejection are the units the next order is judged against, so a legitimate 20-unit order is refused.

## Command and actual output

`npm test` — 14 pass, 3 fail:

```
✔ REQ-ORD-4: a rejected order leaves stock untouched (3.081916ms)
✖ REQ-ORD-4: an over-limit rejection leaves stock and order history untouched (2.44925ms)
✖ REQ-ORD-4: every rejection reason leaves the catalog and orders unchanged (6.796291ms)
✖ REQ-ORD-4: stock consumed by a rejection must not starve a later valid order (2.5105ms)
ℹ tests 17
ℹ pass 14
ℹ fail 3

✖ failing tests:

test at test/orders.test.js:56:1
✖ REQ-ORD-4: an over-limit rejection leaves stock and order history untouched (2.44925ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  22 !== 47

      at file:///Users/raunakkathuria/Documents/ai-sdlc-workshop/test/orders.test.js:63:12

test at test/orders.test.js:78:1
✖ REQ-ORD-4: every rejection reason leaves the catalog and orders unchanged (6.796291ms)
  AssertionError [ERR_ASSERTION]: catalog changed after a over_limit rejection
  + actual - expected

    [
      {
        name: 'Enamel Mug',
        price: 1250,
        sku: 'MUG-1',
  +     stock: 22
  -     stock: 47
      },
      ...
      at file:///Users/raunakkathuria/Documents/ai-sdlc-workshop/test/orders.test.js:95:14

test at test/orders.test.js:103:1
✖ REQ-ORD-4: stock consumed by a rejection must not starve a later valid order (2.5105ms)
  AssertionError [ERR_ASSERTION]: rejected orders left only 5 in stock

  422 !== 201

      at file:///Users/raunakkathuria/Documents/ai-sdlc-workshop/test/orders.test.js:115:12
```

Each fails on a distinct assertion, and the first reproduces the report's numbers exactly: 47 before, 22 after.

**Polarity check (separate from the run above):** I temporarily moved the decrement below the `over_limit` check, got 17/17 green, then restored `app/server.mjs` — `git diff app/server.mjs` is clean and no fix is in the tree.

**Gate status:** `npm run verify` is red by design at this step — `req-coverage` passes 9/9, `node --test` fails on the three new tests. Turning it green is the fix prompt's job.

## Why it fails today

This fails today because `app/server.mjs:60` decrements `item.stock` before validation is complete and no rejection path restores it, so the one reason checked after the decrement — `over_limit` — consumes units for a trade that never happened.
