import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/agent-config', label: 'Agent Config', icon: '⚙️' },
  { path: '/products', label: 'Products', icon: '📦' },
  { path: '/orders', label: 'Orders', icon: '📋' },
  { path: '/delivery-men', label: 'Delivery Men', icon: '🚗' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${
              location.pathname === item.path ? 'active' : ''
            }`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
