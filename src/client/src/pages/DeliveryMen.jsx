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
