import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>WhatsApp AI Agent for E-commerce</h1>
          <p>
            Boost your sales with an intelligent AI agent that handles customer
            service, product recommendations, and order management on WhatsApp.
          </p>
          <div className="hero-buttons">
            <Link to="/signup" className="btn btn-primary btn-lg">
              Get Started Free
            </Link>
            <Link to="/signin" className="btn btn-outline btn-lg">
              Sign In
            </Link>
          </div>
        </div>
        <div className="hero-image">
          <div className="phone-mockup">📱</div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2>Powerful Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI-Powered Conversations</h3>
            <p>
              Intelligent agent that understands customer intent and responds
              naturally in multiple languages.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📦</div>
            <h3>Product Management</h3>
            <p>
              Easily add, manage, and showcase your products with images,
              descriptions, sizes, and colors.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛒</div>
            <h3>Order Management</h3>
            <p>
              Customers can browse, select, and place orders directly through
              WhatsApp with your AI agent.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Dashboard & Analytics</h3>
            <p>
              Monitor orders, track revenue, view top products, and manage
              customers from your dashboard.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚙️</div>
            <h3>Full Customization</h3>
            <p>
              Configure your agent's language, tone, and response style to match
              your brand personality.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌍</div>
            <h3>Multi-Language Support</h3>
            <p>
              Support customers in Darija, English, French, and Arabic with
              intelligent language detection.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits">
        <h2>Why Choose Us</h2>
        <div className="benefits-list">
          <div className="benefit-item">
            <span className="check">✅</span>
            <div>
              <h4>24/7 Customer Service</h4>
              <p>Your AI agent never sleeps, handling inquiries anytime.</p>
            </div>
          </div>
          <div className="benefit-item">
            <span className="check">✅</span>
            <div>
              <h4>Increased Sales</h4>
              <p>Guide customers through purchasing with personalized recommendations.</p>
            </div>
          </div>
          <div className="benefit-item">
            <span className="check">✅</span>
            <div>
              <h4>Reduce Response Time</h4>
              <p>Instant responses to customer inquiries improve satisfaction.</p>
            </div>
          </div>
          <div className="benefit-item">
            <span className="check">✅</span>
            <div>
              <h4>Save Time & Money</h4>
              <p>Automate customer service and reduce manual workload.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <h2>Ready to Transform Your Business?</h2>
        <p>Join thousands of merchants using WhatsApp AI Agent to grow their sales.</p>
        <Link to="/signup" className="btn btn-primary btn-lg">
          Create Free Account
        </Link>
      </section>
    </div>
  );
}
