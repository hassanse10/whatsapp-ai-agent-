# Delivery Men, Order Assignment, Shipped Notification & CSV Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add delivery man management, order assignment, auto WhatsApp notification on shipped status, and CSV export to the dashboard.

**Architecture:** New `delivery_men` table + `delivery_man_id` on `orders`. Dedicated backend CRUD route + extension of the existing orders PUT route to handle shipping notification. New React page follows the exact same pattern as Products.jsx. Orders.jsx gets a delivery man dropdown and an Export CSV button (client-side only).

**Tech Stack:** Node.js/Express, PostgreSQL, React, whatsapp-web.js session manager

---

## File Map

| File | Change |
|---|---|
| `migrations/006_add_delivery_men.sql` | Create |
| `src/routes/deliveryMen.js` | Create |
| `src/index.js` | Register `/api/delivery-men` route |
| `src/routes/orders.js` | Accept `deliveryManId`, send WhatsApp on shipped |
| `src/client/src/services/api.js` | Add `deliveryMenAPI` |
| `src/client/src/pages/DeliveryMen.jsx` | Create |
| `src/client/src/pages/DeliveryMen.css` | Create |
| `src/client/src/App.jsx` | Add `/delivery-men` protected route |
| `src/client/src/components/Sidebar.jsx` | Add Delivery Men nav item |
| `src/client/src/pages/Orders.jsx` | Add delivery man dropdown + CSV export |

---

### Task 1: Database migration — delivery_men table + orders column

**Files:**
- Create: `migrations/006_add_delivery_men.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- migrations/006_add_delivery_men.sql
CREATE TABLE IF NOT EXISTS delivery_men (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  phone        VARCHAR(50)  NOT NULL,
  vehicle_type VARCHAR(100),
  license_id   VARCHAR(100),
  created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_man_id UUID REFERENCES delivery_men(id) ON DELETE SET NULL;
```

- [ ] **Step 2: Run the migration**

```bash
cd "c:/Users/HASSAN/App2/whatapp agent AI" && node scripts/migrate.js
```

Expected output includes `→ 006_add_delivery_men.sql` and `✅ Migrations completed successfully!`

- [ ] **Step 3: Commit**

```bash
git add migrations/006_add_delivery_men.sql
git commit -m "feat: add delivery_men table and delivery_man_id to orders"
```

---

### Task 2: Backend — delivery men CRUD routes

**Files:**
- Create: `src/routes/deliveryMen.js`

- [ ] **Step 1: Create the route file**

```js
// src/routes/deliveryMen.js
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const db = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/delivery-men
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM delivery_men WHERE user_id = $1 ORDER BY name ASC',
      [req.userId]
    );
    return res.status(200).json({ deliveryMen: result.rows });
  } catch (error) {
    logger.error('Error fetching delivery men', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/delivery-men
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, phone, vehicleType, licenseId } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    const result = await db.query(
      `INSERT INTO delivery_men (user_id, name, phone, vehicle_type, license_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, name.trim(), phone.trim(), vehicleType?.trim() || null, licenseId?.trim() || null]
    );
    logger.info('Delivery man created', { userId: req.userId, name });
    return res.status(201).json({ deliveryMan: result.rows[0] });
  } catch (error) {
    logger.error('Error creating delivery man', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/delivery-men/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, phone, vehicleType, licenseId } = req.body;
    const result = await db.query(
      `UPDATE delivery_men
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           vehicle_type = COALESCE($3, vehicle_type),
           license_id = COALESCE($4, license_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [name?.trim() || null, phone?.trim() || null, vehicleType?.trim() || null, licenseId?.trim() || null, req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery man not found' });
    }
    return res.status(200).json({ deliveryMan: result.rows[0] });
  } catch (error) {
    logger.error('Error updating delivery man', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/delivery-men/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Block delete if assigned to active (non-delivered, non-cancelled) orders
    const activeOrders = await db.query(
      `SELECT COUNT(*) as count FROM orders
       WHERE delivery_man_id = $1 AND status NOT IN ('delivered', 'cancelled')`,
      [req.params.id]
    );
    if (parseInt(activeOrders.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete — assigned to active orders' });
    }
    const result = await db.query(
      'DELETE FROM delivery_men WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery man not found' });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error deleting delivery man', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/deliveryMen.js
git commit -m "feat: add delivery men CRUD routes"
```

---

### Task 3: Register delivery men route + extend orders PUT

**Files:**
- Modify: `src/index.js`
- Modify: `src/routes/orders.js`

- [ ] **Step 1: Register route in src/index.js**

Find the API Routes block (lines 95–100). Add one line:

```js
app.use('/api/delivery-men', require('./routes/deliveryMen'));
```

Full block after change:
```js
// API Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/agents',        require('./routes/agents'));
app.use('/api/products',      require('./routes/products'));
app.use('/api/orders',        require('./routes/orders'));
app.use('/api/dashboard',     require('./routes/dashboard'));
app.use('/api/delivery-men',  require('./routes/deliveryMen'));
```

- [ ] **Step 2: Extend orders PUT to handle deliveryManId + WhatsApp on shipped**

In `src/routes/orders.js`, find the top of the file. Add the sessionManager import after the existing requires:

```js
const sessionManager = require('../services/whatsappSessionManager');
```

Then find the `PUT /:orderId` handler. Replace the body destructuring line:
```js
// BEFORE
const { status, trackingNumber, estimatedDelivery } = req.body;

// AFTER
const { status, trackingNumber, estimatedDelivery, deliveryManId } = req.body;
```

Add `deliveryManId` to the dynamic updates block, after the `estimatedDelivery` block:

```js
if (deliveryManId !== undefined) {
  updates.push(`delivery_man_id = $${idx++}`);
  values.push(deliveryManId || null);
}
```

After the existing `if (result.rows.length === 0)` check and before the `logger.info` line, add the WhatsApp shipping notification block:

```js
    // Auto-send WhatsApp notification when status changes to shipped
    if (status === 'shipped') {
      try {
        const updatedOrder = result.rows[0];

        // Fetch customer phone
        const customerResult = await db.query(
          `SELECT c.phone_number FROM customers c
           JOIN orders o ON o.customer_id = c.id
           WHERE o.id = $1`,
          [orderId]
        );

        // Fetch delivery man
        const dmId = deliveryManId || updatedOrder.delivery_man_id;
        const dmResult = dmId ? await db.query(
          'SELECT name, phone, vehicle_type FROM delivery_men WHERE id = $1 AND user_id = $2',
          [dmId, req.userId]
        ) : { rows: [] };

        // Fetch order items
        const itemsResult = await db.query(
          'SELECT product_name, quantity, size, color, price FROM order_items WHERE order_id = $1',
          [orderId]
        );

        if (customerResult.rows.length > 0) {
          const phone = customerResult.rows[0].phone_number;
          const dm = dmResult.rows[0] || null;
          const items = itemsResult.rows;
          const total = parseFloat(updatedOrder.total_price).toFixed(2);

          let itemLines = items.map(i => {
            let line = `• ${i.quantity}x ${i.product_name}`;
            if (i.size || i.color) line += ` (${[i.size, i.color].filter(Boolean).join(' / ')})`;
            line += ` — ${parseFloat(i.price * i.quantity).toFixed(2)} MAD`;
            return line;
          }).join('\n');

          let msg = `✅ *طلبيتك غادي تتوصل ليك!*\n\n`;
          msg += `🔖 رقم الطلبية: *#${updatedOrder.order_number}*\n`;
          msg += `📦 المنتجات:\n${itemLines}\n`;
          msg += `💰 المجموع: *${total} MAD*\n`;
          if (updatedOrder.shipping_address) msg += `📍 العنوان: ${updatedOrder.shipping_address}\n`;

          if (dm) {
            msg += `\n🚗 *معلومات السائق:*\n`;
            msg += `👤 الاسم: ${dm.name}\n`;
            msg += `📱 الهاتف: ${dm.phone}\n`;
            if (dm.vehicle_type) msg += `🚘 المركبة: ${dm.vehicle_type}\n`;
          }

          msg += `\nشكراً على ثقتك فينا! 🙏`;

          await sessionManager.sendText(req.userId, phone, msg);
          logger.info('Shipped WhatsApp notification sent', { orderId, phone });
        }
      } catch (notifyErr) {
        logger.error('Failed to send shipped WhatsApp notification', { orderId, error: notifyErr.message });
        // Do NOT fail the request — order update already succeeded
      }
    }
```

- [ ] **Step 3: Commit**

```bash
git add src/index.js src/routes/orders.js
git commit -m "feat: register delivery-men route, send WhatsApp on order shipped"
```

---

### Task 4: Frontend API client — add deliveryMenAPI

**Files:**
- Modify: `src/client/src/services/api.js`

- [ ] **Step 1: Add deliveryMenAPI export**

In `src/client/src/services/api.js`, add after the `ordersAPI` block:

```js
// Delivery Men API
export const deliveryMenAPI = {
  getAll: () => api.get('/delivery-men'),
  create: (data) => api.post('/delivery-men', data),
  update: (id, data) => api.put(`/delivery-men/${id}`, data),
  delete: (id) => api.delete(`/delivery-men/${id}`),
};
```

- [ ] **Step 2: Commit**

```bash
git add src/client/src/services/api.js
git commit -m "feat: add deliveryMenAPI to api client"
```

---

### Task 5: Delivery Men page (JSX + CSS)

**Files:**
- Create: `src/client/src/pages/DeliveryMen.jsx`
- Create: `src/client/src/pages/DeliveryMen.css`

- [ ] **Step 1: Create DeliveryMen.jsx**

```jsx
// src/client/src/pages/DeliveryMen.jsx
import React, { useState, useEffect } from 'react';
import { deliveryMenAPI } from '../services/api';
import './DeliveryMen.css';

const EMPTY_FORM = { name: '', phone: '', vehicleType: '', licenseId: '' };

export default function DeliveryMen() {
  const [deliveryMen, setDeliveryMen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await deliveryMenAPI.getAll();
      setDeliveryMen(res.data.deliveryMen || []);
    } catch {
      setError('Failed to load delivery men');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone are required');
      return;
    }
    try {
      setSaving(true);
      setError('');
      if (editingId) {
        const res = await deliveryMenAPI.update(editingId, form);
        setDeliveryMen(prev => prev.map(d => d.id === editingId ? res.data.deliveryMan : d));
        setSuccess('Updated successfully');
      } else {
        const res = await deliveryMenAPI.create(form);
        setDeliveryMen(prev => [...prev, res.data.deliveryMan]);
        setSuccess('Delivery man added');
      }
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (dm) => {
    setForm({ name: dm.name, phone: dm.phone, vehicleType: dm.vehicle_type || '', licenseId: dm.license_id || '' });
    setEditingId(dm.id);
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this delivery man?')) return;
    try {
      await deliveryMenAPI.delete(id);
      setDeliveryMen(prev => prev.filter(d => d.id !== id));
      setSuccess('Deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div className="delivery-men-page">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Delivery Men</h1>
            <p className="page-subtitle">Manage your delivery staff</p>
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            + Add Delivery Man
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="card dm-form-card">
          <h3>{editingId ? 'Edit Delivery Man' : 'New Delivery Man'}</h3>
          <form onSubmit={handleSubmit} className="dm-form">
            <div className="form-group">
              <label>Name *</label>
              <input className="form-control" name="name" value={form.name} onChange={handleChange} placeholder="Full name" required />
            </div>
            <div className="form-group">
              <label>Phone *</label>
              <input className="form-control" name="phone" value={form.phone} onChange={handleChange} placeholder="+212 6XX-XXX-XXX" required />
            </div>
            <div className="form-group">
              <label>Vehicle Type</label>
              <input className="form-control" name="vehicleType" value={form.vehicleType} onChange={handleChange} placeholder="e.g. Motorbike, Car, Van" />
            </div>
            <div className="form-group">
              <label>License / ID</label>
              <input className="form-control" name="licenseId" value={form.licenseId} onChange={handleChange} placeholder="e.g. LIC-1234" />
            </div>
            <div className="dm-form-actions">
              <button type="button" className="btn btn-outline" onClick={resetForm} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update' : 'Add'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {deliveryMen.length > 0 ? (
        <div className="card">
          <table className="dm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Vehicle</th>
                <th>License ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveryMen.map(dm => (
                <tr key={dm.id}>
                  <td className="dm-name">{dm.name}</td>
                  <td>{dm.phone}</td>
                  <td>{dm.vehicle_type ? <span className="vehicle-badge">{dm.vehicle_type}</span> : <span className="text-muted">—</span>}</td>
                  <td className="text-muted">{dm.license_id || '—'}</td>
                  <td className="dm-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(dm)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(dm.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-icon">🚗</div>
          <h2>No Delivery Men Yet</h2>
          <p>Add your first delivery staff member to start assigning orders.</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create DeliveryMen.css**

```css
/* src/client/src/pages/DeliveryMen.css */
.delivery-men-page { animation: fadeIn 0.3s ease-in; }

.page-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
}

.dm-form-card { margin-bottom: 1.5rem; }
.dm-form-card h3 { margin: 0 0 1rem; font-size: 1rem; }

.dm-form {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 1rem;
  align-items: end;
}

.dm-form-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding-top: 1.5rem;
}

.dm-table { width: 100%; border-collapse: collapse; }
.dm-table th, .dm-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border-color, #e5e7eb); }
.dm-table th { background: #f9fafb; font-size: 0.8rem; font-weight: 600; color: #6b7280; text-transform: uppercase; }
.dm-table tbody tr:hover { background: #f9fafb; }
.dm-table tbody tr:last-child td { border-bottom: none; }

.dm-name { font-weight: 600; }
.dm-actions { display: flex; gap: 0.5rem; }
.text-muted { color: #9ca3af; }

.vehicle-badge {
  background: #dbeafe;
  color: #1d4ed8;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.alert-success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .dm-form { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .dm-form { grid-template-columns: 1fr; }
  .dm-table thead { display: none; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/client/src/pages/DeliveryMen.jsx src/client/src/pages/DeliveryMen.css
git commit -m "feat: add DeliveryMen page with CRUD"
```

---

### Task 6: Wire up App.jsx and Sidebar

**Files:**
- Modify: `src/client/src/App.jsx`
- Modify: `src/client/src/components/Sidebar.jsx`

- [ ] **Step 1: Add import and route in App.jsx**

Add import after the `Orders` import (line 14):
```js
import DeliveryMen from './pages/DeliveryMen';
```

Add route after the `/orders` route block (after line 83):
```jsx
<Route
  path="/delivery-men"
  element={
    <PrivateRoute>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <DeliveryMen />
        </main>
      </div>
    </PrivateRoute>
  }
/>
```

- [ ] **Step 2: Add nav item in Sidebar.jsx**

In `src/client/src/components/Sidebar.jsx`, add the delivery men item to `menuItems` between Orders and Profile:

```js
const menuItems = [
  { path: '/dashboard',     label: 'Dashboard',     icon: '📊' },
  { path: '/agent-config',  label: 'Agent Config',  icon: '⚙️' },
  { path: '/products',      label: 'Products',      icon: '📦' },
  { path: '/orders',        label: 'Orders',        icon: '📋' },
  { path: '/delivery-men',  label: 'Delivery Men',  icon: '🚗' },
  { path: '/profile',       label: 'Profile',       icon: '👤' },
];
```

- [ ] **Step 3: Commit**

```bash
git add src/client/src/App.jsx src/client/src/components/Sidebar.jsx
git commit -m "feat: add Delivery Men route and sidebar nav item"
```

---

### Task 7: Update Orders page — delivery man dropdown + CSV export

**Files:**
- Modify: `src/client/src/pages/Orders.jsx`

- [ ] **Step 1: Add deliveryMenAPI import**

At the top of `src/client/src/pages/Orders.jsx`, change the import line:
```js
// BEFORE
import { ordersAPI } from '../services/api';

// AFTER
import { ordersAPI, deliveryMenAPI } from '../services/api';
```

- [ ] **Step 2: Add delivery men state + fetch**

Inside the `Orders` component, add new state after the existing `saving` state:
```js
const [deliveryMen, setDeliveryMen] = useState([]);
const [editDeliveryManId, setEditDeliveryManId] = useState('');
```

In `viewOrderDetails`, after setting `setEditDelivery(...)`, add:
```js
setEditDeliveryManId(order.delivery_man_id || '');
// Fetch delivery men list once
if (deliveryMen.length === 0) {
  try {
    const dmRes = await deliveryMenAPI.getAll();
    setDeliveryMen(dmRes.data.deliveryMen || []);
  } catch (_) {}
}
```

- [ ] **Step 3: Pass deliveryManId in handleSaveChanges**

In `handleSaveChanges`, update the `ordersAPI.updateStatus` call to include `deliveryManId`:
```js
const res = await ordersAPI.updateStatus(
  selectedOrder.id,
  editStatus,
  editTracking || undefined,
  editDelivery || undefined,
  editDeliveryManId || undefined
);
```

Update `ordersAPI.updateStatus` signature in `api.js` to pass it through:
```js
updateStatus: (orderId, status, trackingNumber, estimatedDelivery, deliveryManId) =>
  api.put(`/orders/${orderId}`, { status, trackingNumber, estimatedDelivery, deliveryManId }),
```

- [ ] **Step 4: Add Delivery Man select to the manage grid in the modal**

In the JSX, the `manage-grid` currently has 3 form groups (status, tracking, delivery date). Add a 4th after delivery date:

```jsx
<div className="form-group">
  <label>Delivery Man</label>
  <select
    className="form-control"
    value={editDeliveryManId}
    onChange={(e) => setEditDeliveryManId(e.target.value)}
    disabled={saving}
  >
    <option value="">— Unassigned —</option>
    {deliveryMen.map(dm => (
      <option key={dm.id} value={dm.id}>
        {dm.name}{dm.vehicle_type ? ` — ${dm.vehicle_type}` : ''}
      </option>
    ))}
  </select>
</div>
```

Update the manage-grid CSS to use `1fr 1fr` (2×2) instead of `1fr 1fr 1fr` in `Orders.css`:
```css
.manage-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
```

- [ ] **Step 5: Show warning banner when status is shipped**

After the manage-grid closing `</div>`, add:
```jsx
{editStatus === 'shipped' && (
  <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'6px',padding:'0.6rem 0.9rem',fontSize:'0.8rem',color:'#92400e',marginTop:'0.75rem'}}>
    ⚡ Status is <strong>shipped</strong> — saving will auto-send a WhatsApp notification to the customer.
  </div>
)}
```

- [ ] **Step 6: Add Export CSV button to page header**

In the page header row, after the `live-badge` div, add:
```jsx
<button className="btn btn-outline btn-sm" onClick={handleExportCSV}>
  ⬇ Export CSV
</button>
```

Add the `handleExportCSV` function inside the component (before the `if (loading)` line):
```js
const handleExportCSV = () => {
  const headers = ['Order Number','Customer','Phone','Status','Total (MAD)','Payment','Shipping Address','Date'];
  const rows = orders.map(o => [
    o.order_number,
    o.customer_name || '',
    o.phone_number || '',
    o.status,
    parseFloat(o.total_price).toFixed(2),
    (o.payment_method || '').replace(/_/g, ' '),
    (o.shipping_address || '').replace(/,/g, ' '),
    new Date(o.created_at).toLocaleDateString(),
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
```

- [ ] **Step 7: Commit**

```bash
git add src/client/src/pages/Orders.jsx src/client/src/pages/Orders.css src/client/src/services/api.js
git commit -m "feat: add delivery man assignment and CSV export to Orders page"
```

---

## Verification

1. **Migration** — `SELECT * FROM delivery_men LIMIT 1;` returns empty table, no error
2. **Create delivery man** — `POST /api/delivery-men` with `{name, phone, vehicleType, licenseId}` → 201
3. **Delivery Men page** — navigate to `/delivery-men`, add a delivery man, edit it, see it in table
4. **Assign to order** — open any order modal, pick delivery man from dropdown, Save
5. **Shipped notification** — set status to "shipped" with a delivery man assigned, Save → customer gets WhatsApp with order + driver details
6. **No delivery man shipped** — set shipped with no delivery man → order updates, no crash, warning in server log
7. **Delete blocked** — try deleting a delivery man assigned to an active order → 400 error shown
8. **CSV export** — click Export CSV → `orders-YYYY-MM-DD.csv` downloads with correct columns
