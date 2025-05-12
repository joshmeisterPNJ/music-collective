// src/pages/ChangePasswordPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../AuthContext';

export default function ChangePasswordPage() {
  const { user, loading, setToken } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword     ] = useState('');
  const [error,           setError           ] = useState(null);
  const [success,         setSuccess         ] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/auth/change-password`,
        { currentPassword, newPassword }
      );
      // Inform AuthContext and persist the new token
      setToken(data.token);
      localStorage.setItem('token', data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setSuccess(data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Error updating password');
    }
  };

  useEffect(() => {
    // Only fire once the password change succeeded,
    // AuthContext has reloaded the user (must_change_password cleared),
    // and we have a user object.
    if (success && !loading && user && user.must_change_password === false) {
      let target;
      if (user.role === 'superadmin') {
        // superadmins go to events admin
        target = '/admin/events';
      } else if (user.permissions?.includes('events')) {
        // admins with events permission
        target = '/admin/events';
      } else if (user.permissions?.includes('users')) {
        // admins with users permission
        target = '/admin/users';
      } else {
        // all others (including regular admins with only "members" perm)
        // land on their own profile in back‑office
        target = `/admin/members/${user.id}`;
      }
      navigate(target, { replace: true });
    }
  }, [success, loading, user, navigate]);

  return (
    <div className="change-password">
      <h1>Change Password</h1>
      {error   && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Current Password
          <input
            required
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
          />
        </label>
        <label>
          New Password
          <input
            required
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
        </label>
        <button type="submit">Update Password</button>
      </form>
    </div>
  );
}
