import React, { useState, useEffect } from 'react';
import { productsAPI } from '../services/api';
import FormInput from '../components/FormInput';
import './Products.css';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    sizes: '',
    colors: '',
    stockQuantity: '',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await productsAPI.getAll();
      setProducts(res.data.products || []);
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      imageUrl: '',
      sizes: '',
      colors: '',
      stockQuantity: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name || !formData.price) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        image_url: formData.imageUrl,
        sizes: formData.sizes ? formData.sizes.split(',').map(s => s.trim()) : [],
        colors: formData.colors ? formData.colors.split(',').map(c => c.trim()) : [],
        stock_quantity: parseInt(formData.stockQuantity) || 0,
      };
      console.log('Form Data:', JSON.stringify(formData, null, 2));
      console.log('Payload being sent:', JSON.stringify(payload, null, 2));

      if (editingId) {
        await productsAPI.update(editingId, payload);
        setSuccess('Product updated successfully!');
      } else {
        await productsAPI.create(payload);
        setSuccess('Product created successfully!');
      }

      resetForm();
      fetchProducts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save product');
    }
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price != null ? String(product.price) : '',
      imageUrl: product.image_url || '',
      sizes: product.sizes?.join(', ') || '',
      colors: product.colors?.join(', ') || '',
      stockQuantity: product.stock_quantity != null ? String(product.stock_quantity) : '',
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        setError('');
        await productsAPI.delete(id);
        setSuccess('Product deleted successfully!');
        fetchProducts();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Failed to delete product');
      }
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="products-page">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage your product catalog</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Add Product
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Product Form */}
      {showForm && (
        <div className="product-form card">
          <div className="card-header flex-between">
            <h2>{editingId ? 'Edit Product' : 'Add New Product'}</h2>
            <button
              type="button"
              className="btn-close"
              onClick={resetForm}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <FormInput
                label="Product Name *"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Blue T-Shirt"
                required
              />
              <FormInput
                label="Price *"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
            </div>

            <FormInput
              label="Description"
              type="textarea"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your product..."
            />

            <FormInput
              label="Image URL"
              type="text"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />

            <div className="form-row">
              <FormInput
                label="Sizes (comma-separated)"
                type="text"
                name="sizes"
                value={formData.sizes}
                onChange={handleChange}
                placeholder="S, M, L, XL"
              />
              <FormInput
                label="Colors (comma-separated)"
                type="text"
                name="colors"
                value={formData.colors}
                onChange={handleChange}
                placeholder="Red, Blue, Black"
              />
            </div>

            <FormInput
              label="Stock Quantity"
              type="number"
              name="stockQuantity"
              value={formData.stockQuantity}
              onChange={handleChange}
              placeholder="0"
            />

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update Product' : 'Create Product'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table */}
      {products.length > 0 ? (
        <div className="card">
          <table className="products-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Sizes</th>
                <th>Colors</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="product-thumb"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="product-thumb-placeholder">📦</div>
                    )}
                  </td>
                  <td>
                    <div>
                      <div className="product-name">{product.name}</div>
                      {product.description && (
                        <div className="product-description">
                          {product.description.substring(0, 50)}...
                        </div>
                      )}
                    </div>
                  </td>
                  <td>${parseFloat(product.price).toFixed(2)}</td>
                  <td>{product.stock_quantity || 0}</td>
                  <td>
                    {product.sizes?.join(', ') || '-'}
                  </td>
                  <td>
                    {product.colors?.join(', ') || '-'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleEdit(product)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(product.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-icon">📦</div>
          <h2>No Products Yet</h2>
          <p>Add your first product to get started</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Add Product
          </button>
        </div>
      )}
    </div>
  );
}
