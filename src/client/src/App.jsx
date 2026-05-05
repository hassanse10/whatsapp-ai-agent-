import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Pages
import Home from './pages/Home';
import Signup from './pages/Signup';
import Signin from './pages/Signin';
import Dashboard from './pages/Dashboard';
import AgentConfig from './pages/AgentConfig';
import Products from './pages/Products';
import Orders from './pages/Orders';
import DeliveryMen from './pages/DeliveryMen';
import Profile from './pages/Profile';
import PrivateRoute from './pages/PrivateRoute';

import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/signin" element={<Signin />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <div className="app-layout">
                  <Sidebar />
                  <main className="main-content">
                    <Dashboard />
                  </main>
                </div>
              </PrivateRoute>
            }
          />
          <Route
            path="/agent-config"
            element={
              <PrivateRoute>
                <div className="app-layout">
                  <Sidebar />
                  <main className="main-content">
                    <AgentConfig />
                  </main>
                </div>
              </PrivateRoute>
            }
          />
          <Route
            path="/products"
            element={
              <PrivateRoute>
                <div className="app-layout">
                  <Sidebar />
                  <main className="main-content">
                    <Products />
                  </main>
                </div>
              </PrivateRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <PrivateRoute>
                <div className="app-layout">
                  <Sidebar />
                  <main className="main-content">
                    <Orders />
                  </main>
                </div>
              </PrivateRoute>
            }
          />
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
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <div className="app-layout">
                  <Sidebar />
                  <main className="main-content">
                    <Profile />
                  </main>
                </div>
              </PrivateRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
