# Fix Important Issues — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 9 important bugs: wrong currency symbol, un-scoped order lookups, broken session count in health endpoint, NaN in SQL LIMIT, missing auth rate limiting, open CORS, oversized DB pool, missing email validation, and untracked stock.

**Architecture:** All fixes are surgical — each touches 1–3 files with no new abstractions. The order scoping fix threads `userId` through model → service → intent handlers (context already carries it). Stock decrement runs inside the existing transaction in `createOrder`.

**Tech Stack:** Node.js, Express, PostgreSQL (pg), express-rate-limit, cors

---

### Task 1: Fix currency — `formatPrice` outputs MAD not $

**Files:**
- Modify: `src/utils/helpers.js:119-121`

- [ ] **Step 1: Apply the fix**

In `src/utils/helpers.js`, replace lines 119–121:

```js
// BEFORE
const formatPrice = (price) => {
  return `$${parseFloat(price).toFixed(2)}`;
};

// AFTER
const formatPrice = (price) => {
  return `${parseFloat(price).toFixed(2)} MAD`;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/helpers.js
git commit -m "fix: format prices in MAD not USD"
```

---

### Task 2: Scope `getOrderByNumber` by `user_id`

**Files:**
- Modify: `src/models/order.js:49-60`
- Modify: `src/services/orderService.js:41-46`
- Modify: `src/agents/intentHandlers.js` (handleOrderTrack ~line 287, handleOrderCancel ~line 338, handleOrderModify ~line 356)

**Context:** `context.userId` is already available in all three intent handlers (it is included in the context object built in `whatsappController.js:60-74`). The handlers just need to destructure it and pass it through.

- [ ] **Step 1: Update `getOrderByNumber` in the model**

In `src/models/order.js`, replace the `getOrderByNumber` function (lines 49–60):

```js
const getOrderByNumber = async (orderNumber, userId) => {
  try {
    const result = await db.query(
      `SELECT o.*, json_agg(json_build_object('id', oi.id, 'product_name', oi.product_name,
        'quantity', oi.quantity, 'size', oi.size, 'color', oi.color, 'price', oi.price)) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.order_number = $1 AND o.user_id = $2
       GROUP BY o.id`,
      [orderNumber, userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in getOrderByNumber', { orderNumber, userId, error });
    throw error;
  }
};
```

- [ ] **Step 2: Update `getOrderByNumber` in the service**

In `src/services/orderService.js`, replace the `getOrderByNumber` function (lines 41–46):

```js
const getOrderByNumber = async (orderNumber, userId) => {
  try {
    return await orderModel.getOrderByNumber(orderNumber, userId);
  } catch (error) {
    logger.error('Error getting order by number', { orderNumber, userId, error });
    throw error;
  }
};
```

- [ ] **Step 3: Update `handleOrderTrack` to pass userId**

In `src/agents/intentHandlers.js`, find `handleOrderTrack` (around line 284). The function currently starts with:
```js
const handleOrderTrack = async (context) => {
  const { entities } = context;
  const { formatPrice } = require('../utils/helpers');

  if (entities?.order_id) {
    const order = await orderService.getOrderByNumber(entities.order_id);
```

Change it to destructure `userId` and pass it:
```js
const handleOrderTrack = async (context) => {
  const { entities, userId } = context;
  const { formatPrice } = require('../utils/helpers');

  if (entities?.order_id) {
    const order = await orderService.getOrderByNumber(entities.order_id, userId);
```

- [ ] **Step 4: Update `handleOrderCancel` to pass userId**

In `src/agents/intentHandlers.js`, find `handleOrderCancel` (around line 338). Change:
```js
const handleOrderCancel = async (context) => {
  const { entities } = context;
  ...
    const order = await orderService.getOrderByNumber(entities.order_id);
```
To:
```js
const handleOrderCancel = async (context) => {
  const { entities, userId } = context;
  ...
    const order = await orderService.getOrderByNumber(entities.order_id, userId);
```

- [ ] **Step 5: Update `handleOrderModify` to pass userId**

In `src/agents/intentHandlers.js`, find `handleOrderModify` (around line 356). Change:
```js
const handleOrderModify = async (context) => {
  const { entities, claudeResponse } = context;
  ...
    const order = await orderService.getOrderByNumber(entities.order_id);
```
To:
```js
const handleOrderModify = async (context) => {
  const { entities, claudeResponse, userId } = context;
  ...
    const order = await orderService.getOrderByNumber(entities.order_id, userId);
```

- [ ] **Step 6: Commit**

```bash
git add src/models/order.js src/services/orderService.js src/agents/intentHandlers.js
git commit -m "fix: scope getOrderByNumber by user_id — prevent cross-tenant order access"
```

---

### Task 3: Fix health endpoint — `sessions.size` always 0

**Files:**
- Modify: `src/services/whatsappSessionManager.js` (module.exports block)
- Modify: `src/index.js:67`

**Context:** The `sessions` map is a private `const` inside the module and is not exported. `index.js` reads `require('./services/whatsappSessionManager').sessions?.size || 0` — always 0. Fix: export a `getSessionCount()` getter.

- [ ] **Step 1: Add `getSessionCount` to sessionManager exports**

In `src/services/whatsappSessionManager.js`, find the `module.exports` block (near the end of the file). Add `getSessionCount` to the exports:

```js
module.exports = {
  createSession,
  getSession,
  getQR,
  getStatus,
  isReady,
  destroySession,
  sendText,
  sendMedia,
  restoreSessions,
  addSseClient,
  removeSseClient,
  broadcastToUser,
  getSessionCount: () => sessions.size,   // ← add this line
};
```

(Add only the `getSessionCount` line — keep all other existing exports unchanged.)

- [ ] **Step 2: Use `getSessionCount()` in the health endpoint**

In `src/index.js`, find the health endpoint (around line 62). Change:
```js
// BEFORE
activeSessions: require('./services/whatsappSessionManager').sessions?.size || 0,

// AFTER
activeSessions: sessionManager.getSessionCount(),
```

(`sessionManager` is already imported at the top of `index.js`.)

- [ ] **Step 3: Commit**

```bash
git add src/services/whatsappSessionManager.js src/index.js
git commit -m "fix: export getSessionCount — health endpoint now reports real session count"
```

---

### Task 4: NaN guard on `parseInt(limit/offset)`

**Files:**
- Modify: `src/routes/orders.js:12-13`
- Modify: `src/routes/dashboard.js:31,45`

**Context:** `parseInt('abc')` returns `NaN`. PostgreSQL rejects `LIMIT NaN` with a syntax error, crashing routes with a 500. Fix: use `|| defaultValue` after `parseInt`.

- [ ] **Step 1: Fix orders route**

In `src/routes/orders.js`, replace lines 12–13:
```js
// BEFORE
const limit = req.query.limit ? parseInt(req.query.limit) : 50;
const offset = req.query.offset ? parseInt(req.query.offset) : 0;

// AFTER
const limit = Math.max(1, parseInt(req.query.limit) || 50);
const offset = Math.max(0, parseInt(req.query.offset) || 0);
```

- [ ] **Step 2: Fix dashboard recent-orders route**

In `src/routes/dashboard.js`, replace line 31:
```js
// BEFORE
const limit = req.query.limit ? parseInt(req.query.limit) : 10;

// AFTER
const limit = Math.max(1, parseInt(req.query.limit) || 10);
```

- [ ] **Step 3: Fix dashboard top-products route**

In `src/routes/dashboard.js`, replace line 45:
```js
// BEFORE
const limit = req.query.limit ? parseInt(req.query.limit) : 5;

// AFTER
const limit = Math.max(1, parseInt(req.query.limit) || 5);
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/orders.js src/routes/dashboard.js
git commit -m "fix: guard parseInt(limit/offset) against NaN — prevent SQL crash on bad query params"
```

---

### Task 5: Auth rate limiting + CORS restriction + DB pool size

**Files:**
- Modify: `src/index.js:18-20`
- Modify: `src/config/database.js:16`

These three small config changes are grouped because they're all deployment-safety settings with no logic impact.

- [ ] **Step 1: Add strict rate limiter on auth routes**

In `src/index.js`, after the existing `rateLimit` import and global limiter (lines 5 and 20), add a tight auth-specific limiter and apply it to auth routes:

```js
// Add after line 20 (app.use(rateLimit(...)))  — BEFORE the route declarations
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use('/api/auth/signin', authLimiter);
app.use('/api/auth/signup', authLimiter);
```

- [ ] **Step 2: Restrict CORS to configured origin**

In `src/index.js`, replace line 18:
```js
// BEFORE
app.use(cors());

// AFTER
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
```

Add `CLIENT_URL=https://your-dashboard-domain.com` to `.env.example` with a comment.

- [ ] **Step 3: Reduce DB pool size for Render free tier**

In `src/config/database.js`, replace line 16:
```js
// BEFORE
  max: 20,

// AFTER
  max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : 5,
```

Add `DB_POOL_MAX=5` to `.env.example` with comment: `# Render free tier: max 25 total connections`.

- [ ] **Step 4: Commit**

```bash
git add src/index.js src/config/database.js .env.example
git commit -m "fix: auth rate limit (10/15min), restrict CORS, reduce DB pool to 5 for Render free tier"
```

---

### Task 6: Email validation in signup

**Files:**
- Modify: `src/routes/auth.js:14-16`

- [ ] **Step 1: Add email format check**

In `src/routes/auth.js`, after the existing truthy check on line 14, add an email format validation. Replace lines 13–19:

```js
// BEFORE
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

// AFTER
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/auth.js
git commit -m "fix: validate email format in signup"
```

---

### Task 7: Decrement stock on order creation

**Files:**
- Modify: `src/models/order.js:4-34` (the `createOrder` transaction)

**Context:** `createOrder` runs a transaction inserting into `orders` and `order_items`. Stock decrement must be inside the same transaction so it rolls back if the order insert fails. The `user_products` table has a `stock_quantity` column. Items have `product_id` field available — check what's in the items array by reading how `handleConfirmOrder` builds `existingItems`.

**Important:** Items in the order are stored in `order_items` with `product_name`, not `product_id`. But the items array passed to `createOrder` from `orderService.createOrder` comes from `dbProducts` (the user's product catalog). Read `src/services/orderService.js` `createOrder` function to see what fields are on each item before implementing. Only decrement stock if `product_id` is available on the item.

- [ ] **Step 1: Read orderService.createOrder to confirm item shape**

Read `src/services/orderService.js` lines 1–40 to see what fields are on each item passed to `orderModel.createOrder`. Confirm whether `product_id` (the `user_products.id`) is present.

- [ ] **Step 2: Add stock decrement inside the transaction**

In `src/models/order.js`, inside the `createOrder` function, after the `order_items` INSERT loop (after line 22, before the COMMIT on line 24), add:

```js
    // Decrement stock for each item that has a product_id
    for (const item of items) {
      if (item.product_id) {
        await client.query(
          'UPDATE user_products SET stock_quantity = GREATEST(0, stock_quantity - $1) WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }
```

`GREATEST(0, ...)` prevents stock going negative.

- [ ] **Step 3: Commit**

```bash
git add src/models/order.js
git commit -m "fix: decrement stock_quantity on order creation"
```

---

## Final Verification

After all tasks, restart the server and verify:

1. **Currency** — Send a WhatsApp order message. Confirm the summary and receipt show `249.00 MAD` not `$249.00`.
2. **Order scoping** — Confirm `GET /api/orders?limit=abc` returns 200 (not 500).
3. **Auth rate limit** — Send 11 POST requests to `/api/auth/signin` in 15 min → 11th returns 429.
4. **Health endpoint** — `GET /health` — `activeSessions` reflects real count after connecting a WhatsApp session.
5. **Stock** — After placing a test order, run `SELECT stock_quantity FROM user_products WHERE id = <id>` and confirm quantity decreased.
