# Delivery Men, Order Assignment, Shipped Notification & CSV Export — Design Spec

## Overview

Four linked features that complete the order fulfilment workflow:

1. **Delivery Man Management** — CRUD page for delivery staff
2. **Order Assignment** — assign a delivery man to any order from the order modal
3. **Auto WhatsApp Notification on Shipped** — when an order is marked shipped, automatically send the customer a WhatsApp message with order details + delivery man details
4. **CSV Export** — one-click download of the orders table as a CSV file

---

## 1. Data Model

### New table: `delivery_men`

```sql
CREATE TABLE delivery_men (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(50)  NOT NULL,
  vehicle_type  VARCHAR(100),          -- e.g. Motorbike, Car, Bicycle, Van
  license_id    VARCHAR(100),          -- driver/vehicle ID or license plate
  created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### `orders` table — new column

```sql
ALTER TABLE orders ADD COLUMN delivery_man_id UUID REFERENCES delivery_men(id) ON DELETE SET NULL;
```

---

## 2. Backend

### New route file: `src/routes/deliveryMen.js`

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/delivery-men` | List all delivery men for the authenticated user |
| POST   | `/api/delivery-men` | Create a new delivery man |
| PUT    | `/api/delivery-men/:id` | Update name, phone, vehicle_type, license_id |
| DELETE | `/api/delivery-men/:id` | Delete (only if no active shipped orders reference them) |

All routes use `requireAuth` middleware. All queries filter by `user_id = req.userId`.

### Modified: `src/routes/orders.js` — `PUT /:orderId`

Extended to accept `deliveryManId` in the request body. When `status === 'shipped'`:

1. Verify the order has a delivery man assigned (or one is being assigned in the same request)
2. Fetch delivery man details from `delivery_men`
3. Fetch order items from `order_items`
4. Fetch customer phone from `customers`
5. Call `sessionManager.sendText(userId, customerPhone, message)` with the formatted Darija message
6. Log the notification — do NOT fail the order update if the WhatsApp send fails (log the error, return success)

### WhatsApp message format (Darija)

```
✅ *طلبيتك غادي تتوصل ليك!*

🔖 رقم الطلبية: #{{order_number}}
📦 المنتجات:
  • {{qty}}x {{product_name}} ({{size}} / {{color}}) — {{price}} MAD
💰 المجموع: {{total}} MAD
📍 العنوان: {{shipping_address}}

🚗 *معلومات السائق:*
👤 الاسم: {{delivery_man.name}}
📱 الهاتف: {{delivery_man.phone}}
🚘 المركبة: {{delivery_man.vehicle_type}}

شكراً على ثقتك فينا! 🙏
```

If the order has no delivery man assigned when status is set to `shipped`, the update still succeeds but no WhatsApp message is sent (warn in logs).

---

## 3. Frontend

### New page: `src/client/src/pages/DeliveryMen.jsx`

- Table: name, phone, vehicle type, license ID, Edit / Delete buttons
- "+ Add Delivery Man" button → inline form row or small modal (name, phone, vehicle_type, license_id fields)
- Edit button → same form pre-filled
- Delete button → confirm dialog → `DELETE /api/delivery-men/:id`
- Vehicle type is a free-text input (not a dropdown) — keeps it flexible

### New API module additions: `src/client/src/services/api.js`

```js
export const deliveryMenAPI = {
  getAll: () => api.get('/delivery-men'),
  create: (data) => api.post('/delivery-men', data),
  update: (id, data) => api.put(`/delivery-men/${id}`, data),
  delete: (id) => api.delete(`/delivery-men/${id}`),
};
```

### Modified: `src/client/src/pages/Orders.jsx`

**Order modal additions:**
- New state: `deliveryMen` list (fetched once when modal opens)
- New select: "Delivery Man" dropdown — lists all delivery men as `Name — Vehicle`; includes "Unassigned" option
- New state: `editDeliveryManId`
- When status is `shipped` and a delivery man is selected, show yellow warning banner: *"Saving will auto-send a WhatsApp notification to the customer"*
- `handleSaveChanges` passes `deliveryManId` to `ordersAPI.updateStatus`

**Export CSV button:**
- In the page header row, next to the "Live" badge
- Client-side only — builds CSV string from the currently loaded `orders` array
- Columns: Order Number, Customer, Phone, Status, Total (MAD), Payment, Shipping Address, Delivery Man, Date
- Triggers `<a download>` with a blob URL — no backend needed
- Filename: `orders-YYYY-MM-DD.csv`

### New sidebar nav item

Add "Delivery Men" link to the sidebar, between Orders and Agent Config. Icon: 🚗

---

## 4. Navigation

Add route `/delivery-men` in `src/client/src/App.jsx` pointing to `DeliveryMen` page. Add nav link in the sidebar component.

---

## 5. Database Migration

New file: `migrations/006_add_delivery_men.sql`

```sql
CREATE TABLE delivery_men (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(50)  NOT NULL,
  vehicle_type  VARCHAR(100),
  license_id    VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_man_id UUID REFERENCES delivery_men(id) ON DELETE SET NULL;
```

---

## 6. Error Handling

| Scenario | Behaviour |
|---|---|
| WhatsApp send fails when marking shipped | Log error, still return 200 — order update succeeds |
| Delete delivery man assigned to active order | Return 400: "Cannot delete — assigned to active orders" |
| No delivery man assigned when marking shipped | Update succeeds, no WhatsApp sent, warning logged |
| Delivery man not found on order update | Return 404 |

---

## 7. Files to Create / Modify

| File | Change |
|---|---|
| `migrations/006_add_delivery_men.sql` | New |
| `src/routes/deliveryMen.js` | New |
| `src/index.js` | Register `/api/delivery-men` route |
| `src/routes/orders.js` | Accept `deliveryManId`, trigger WhatsApp on shipped |
| `src/client/src/pages/DeliveryMen.jsx` | New |
| `src/client/src/pages/DeliveryMen.css` | New |
| `src/client/src/pages/Orders.jsx` | Add delivery man dropdown + CSV export button |
| `src/client/src/services/api.js` | Add `deliveryMenAPI` |
| `src/client/src/App.jsx` | Add `/delivery-men` route |
| Sidebar component | Add "Delivery Men" nav link |
