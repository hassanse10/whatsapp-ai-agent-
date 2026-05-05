import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import FormInput from '../components/FormInput';
import './Profile.css';

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    companyName: user?.company_name || '',
    phone: user?.phone || '',
  });
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setLoading(true);
    try {
      await authAPI.updateProfile({
        name: profileData.name,
        company_name: profileData.companyName,
        phone: profileData.phone,
      });
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await authAPI.changePassword(
        passwordData.oldPassword,
        passwordData.newPassword
      );
      setSuccess('Password changed successfully!');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1 className="page-title">Profile Settings</h1>
        <p className="page-subtitle">Manage your account information</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="profile-tabs">
        <button
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile Information
        </button>
        <button
          className={`tab-button ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          Change Password
        </button>
      </div>

      {/* Profile Information Tab */}
      {activeTab === 'profile' && (
        <div className="card profile-card">
          <h2>Profile Information</h2>

          <form onSubmit={handleUpdateProfile}>
            <FormInput
              label="Full Name"
              type="text"
              name="name"
              value={profileData.name}
              onChange={handleProfileChange}
              placeholder="Your full name"
            />

            <FormInput
              label="Email Address"
              type="email"
              name="email"
              value={profileData.email}
              onChange={handleProfileChange}
              disabled
            />

            <FormInput
              label="Company Name"
              type="text"
              name="companyName"
              value={profileData.companyName}
              onChange={handleProfileChange}
              placeholder="Your company name"
            />

            <FormInput
              label="Phone Number"
              type="tel"
              name="phone"
              value={profileData.phone}
              onChange={handleProfileChange}
              placeholder="+1234567890"
            />

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Change Password Tab */}
      {activeTab === 'password' && (
        <div className="card profile-card">
          <h2>Change Password</h2>

          <form onSubmit={handleChangePassword}>
            <FormInput
              label="Current Password"
              type="password"
              name="oldPassword"
              value={passwordData.oldPassword}
              onChange={handlePasswordChange}
              placeholder="Enter your current password"
              required
            />

            <FormInput
              label="New Password"
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              placeholder="Enter your new password"
              required
            />

            <FormInput
              label="Confirm New Password"
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              placeholder="Confirm your new password"
              required
            />

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}

      {/* Account Information */}
      <div className="card account-info">
        <h2>Account Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Account Created:</span>
            <span className="info-value">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Account Status:</span>
            <span className="info-value">
              <span className="status-active">● Active</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
