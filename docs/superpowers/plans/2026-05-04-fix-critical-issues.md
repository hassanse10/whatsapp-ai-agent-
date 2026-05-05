# Fix Critical Security & Data Issues — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 critical bugs: wrong field names in order summary, missing user_id scoping in customer/conversation models, hardcoded JWT secret fallback, and unauthenticated admin endpoint.

**Architecture:** All fixes are surgical — each touches one file with no new abstractions. The customer and conversation model fixes require adding `user_id` as a parameter and updating the SQL queries. The auth fix adds a startup assertion. The admin endpoint fix adds the existing `requireAuth` middleware.

**Tech Stack:** Node.js, PostgreSQL (pg), Express, jsonwebtoken, bcrypt

---

### Task 1: Fix `buildSummary` field name mismatch

**Files:**
- Modify: `src/agents/intentHandlers.js:46-48`

The function receives `collectedData` as `flowState` but reads `flowState.customerName`, `flowState.shippingAddress`, `flowState.paymentMethod`. The actual keys on `collectedData` are `name`, `address`, `payment_method`. All three lines evaluate to falsy — order summary shows no name, address, or payment method.

- [ ] **Step 1: Open the file and confirm the bug**

Read `src/agents/intentHandlers.js` lines 39–50. Confirm the three field names used in `buildSummary` do not match the keys used in `buildReceipt` (lines 53–77), which correctly reads `collectedData.name`, `collectedData.address`, `collectedData.payment_method`.

- [ ] **Step 2: Fix the three field references**

In `src/agents/intentHandlers.js`, replace lines 46–48:

```js
// BEFORE
  if (flowState.customerName)    s += `👤 *الاسم:* ${flowState.customerName}\n`;
  if (flowState.shippingAddress) s += `📍 *العنوان:* ${flowState.shippingAddress}\n`;
  if (flowState.paymentMethod)   s += `💳 *طريقة الأداء:* ${PAYMENT_LABELS[flowState.paymentMethod]}\n`;

// AFTER
  if (flowState.name)           s += `👤 *الاسم:* ${flowState.name}\n`;
  if (flowState.address)        s += `📍 *العنوان:* ${flowState.address}\n`;
  if (flowState.payment_method) s += `💳 *طريقة الأداء:* ${PAYMENT_LABELS[flowState.payment_method]}\n`;
```

- [ ] **Step 3: Verify the fix is consistent with buildReceipt**

Confirm that `buildReceipt` (lines 70–72) uses the same field names: `collectedData.name`, `collectedData.address`, `collectedData.payment_method`. Both functions now read the same keys.

- [ ] **Step 4: Commit**

```bash
git add src/agents/intentHandlers.js
git commit -m "fix: use correct field names in buildSummary (name/address/payment_method)"
```

---

### Task 2: Fail fast when `JWT_SECRET` is not set

**Files:**
- Modify: `src/services/authService.js:7`

The fallback `'your-secret-key-change-in-production'` is a well-known string. Any deployment that omits `JWT_SECRET` from environment variables will sign tokens with this string, allowing token forgery. The fix removes the fallback and adds a startup assertion.

- [ ] **Step 1: Remove the hardcoded fallback and add startup assertion**

In `src/services/authService.js`, replace line 7:

```js
// BEFORE
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// AFTER
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
```

- [ ] **Step 2: Verify .env.example documents JWT_SECRET**

Open `.env.example` (or `.env`). Confirm `JWT_SECRET` is listed. If not, add it:

```
JWT_SECRET=your-random-secret-at-least-32-chars
```

- [ ] **Step 3: Commit**

```bash
git add src/services/authService.js
git commit -m "fix: fail fast on missing JWT_SECRET — remove insecure hardcoded fallback"
```

---

### Task 3: Protect `POST /admin/send` with authentication

**Files:**
- Modify: `src/index.js:77-86`

The endpoint sends WhatsApp messages from any connected session with no authentication — any caller knowing a `userId` can send spam. The `requireAuth` middleware already exists in `src/middleware/auth.js` and is already imported transitively. We just need to apply it.

- [ ] **Step 1: Import requireAuth in index.js**

In `src/index.js`, add the import near the top (after existing imports):

```js
const { requireAuth } = require('./middleware/auth');
```

- [ ] **Step 2: Add requireAuth and userId ownership check to the endpoint**

In `src/index.js`, replace lines 77–86:

```js
// BEFORE
app.post('/admin/send', async (req, res) => {
  const { userId, to, message } = req.body;
  if (!userId || !to || !message) return res.status(400).json({ error: 'userId, to and message are required' });
  try {
    await sessionManager.sendText(userId, to, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AFTER
app.post('/admin/send', requireAuth, async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'to and message are required' });
  try {
    await sessionManager.sendText(req.userId, to, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

Note: `userId` is now taken from `req.userId` (set by `requireAuth`) instead of the request body. This ensures users can only send from their own session.

- [ ] **Step 3: Commit**

```bash
git add src/index.js
git commit -m "fix: protect /admin/send with requireAuth — use req.userId from token"
```

---

### Task 4: Scope `getOrCreateCustomer` by `user_id`

**Files:**
- Modify: `src/models/customer.js:4-26`
- Modify: `src/controllers/whatsappController.js:25`

The current query `SELECT * FROM customers WHERE phone_number = $1` has no `user_id` filter. A customer's phone number belonging to Merchant A will be returned and reused when Merchant B's agent receives a message from the same number. The controller passes `userId` as the second argument but the model treats it as `name`.

- [ ] **Step 1: Update getOrCreateCustomer signature and queries**

In `src/models/customer.js`, replace the `getOrCreateCustomer` function (lines 4–26):

```js
const getOrCreateCustomer = async (phoneNumber, userId) => {
  try {
    const result = await db.query(
      'SELECT * FROM customers WHERE phone_number = $1 AND user_id = $2',
      [phoneNumber, userId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    const newCustomer = await db.query(
      'INSERT INTO customers (phone_number, user_id) VALUES ($1, $2) RETURNING *',
      [phoneNumber, userId]
    );

    logger.info(`New customer created: ${phoneNumber} for user ${userId}`);
    return newCustomer.rows[0];
  } catch (error) {
    logger.error('Error in getOrCreateCustomer', { phoneNumber, userId, error });
    throw error;
  }
};
```

- [ ] **Step 2: Verify controller call site is already correct**

Open `src/controllers/whatsappController.js` line 25. Confirm it already calls:
```js
const customer = await customerModel.getOrCreateCustomer(from, userId);
```
No change needed — the call site is correct. The model signature was the bug.

- [ ] **Step 3: Commit**

```bash
git add src/models/customer.js
git commit -m "fix: scope getOrCreateCustomer by user_id — prevent cross-tenant customer collision"
```

---

### Task 5: Persist `user_id` in `createConversation`

**Files:**
- Modify: `src/models/conversation.js:4-16`
- Modify: `src/controllers/whatsappController.js:27-28`

The model signature is `createConversation(customerId, flowState = {})` but the controller passes `userId` as the second argument (line 28). This means `userId` (a UUID string) is serialized as the `flow_state` JSON value, and the `user_id` column added by migration 003 is never populated.

- [ ] **Step 1: Update createConversation to accept and persist user_id**

In `src/models/conversation.js`, replace the `createConversation` function (lines 4–16):

```js
const createConversation = async (customerId, userId) => {
  try {
    const result = await db.query(
      'INSERT INTO conversations (customer_id, user_id, flow_state) VALUES ($1, $2, $3) RETURNING *',
      [customerId, userId, JSON.stringify({})]
    );
    logger.info(`Conversation created for customer ${customerId} under user ${userId}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error in createConversation', { customerId, userId, error });
    throw error;
  }
};
```

- [ ] **Step 2: Verify controller call site is already correct**

Open `src/controllers/whatsappController.js` lines 27–28. Confirm it already calls:
```js
(await conversationModel.createConversation(customer.id, userId));
```
No change needed — the call site was correct. The model was the bug.

- [ ] **Step 3: Verify getActiveConversation still works**

Open `src/models/conversation.js` `getActiveConversation` (lines 28–38). It queries by `customer_id` only. In a multi-tenant system, customers are now scoped by `user_id` (Task 4), so `customer.id` will always belong to the correct user. No change needed for this function.

- [ ] **Step 4: Commit**

```bash
git add src/models/conversation.js
git commit -m "fix: persist user_id in createConversation — restore multi-tenant data isolation"
```

---

## Final Verification

After all 5 tasks are complete, run the following to confirm no regressions:

```bash
node -e "require('dotenv').config(); require('./src/services/authService')"
```
Expected: starts without error (assuming JWT_SECRET is in .env).

```bash
node -e "require('dotenv').config(); const db = require('./src/config/database'); db.testConnection().then(() => { console.log('DB OK'); process.exit(0); })"
```
Expected: `DB OK`

Then restart the server and send a test WhatsApp message through the bot to verify the order summary now shows name, address, and payment correctly.
