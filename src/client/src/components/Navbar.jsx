import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  return (
    <nav className="navbar">
      <div className="container flex-between">
        <div className="navbar-brand">
          <Link to={user ? '/dashboard' : '/'}>
            <span className="logo">📱 WhatsApp AI Agent</span>
          </Link>
        </div>

        <div className="navbar-menu">
          {user ? (
            <div className="user-menu flex-between">
              <span className="user-name">{user.email}</span>
              <button className="btn-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-links flex">
              <Link to="/signin" className="nav-link">
                Sign In
              </Link>
              <Link to="/signup" className="nav-link btn-primary">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
