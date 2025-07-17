// src/pages/ChangePasswordPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';   // ← import the translation hook

export default function ChangePasswordPage() {
  const { t } = useTranslation();                 // ← get the translator
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
      // Persist new token
      setToken(data.token);
      localStorage.setItem('token', data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setSuccess(data.message);
    } catch (err) {
      // If server sent an error string, show it; otherwise use fallback translation
      setError(
        err.response?.data?.error ||
        t('changePasswordPage.errorMessage')
      );
    }
  };

  useEffect(() => {
    // After success and AuthContext reload, redirect off the forced-password page
    if (success && !loading && user && user.must_change_password === false) {
      let target;
      if (user.role === 'superadmin') {
        target = '/admin/events';
      } else if (user.permissions?.includes('events')) {
        target = '/admin/events';
      } else if (user.permissions?.includes('users')) {
        target = '/admin/users';
      } else {
        target = `/admin/members/${user.id}`;
      }
      navigate(target, { replace: true });
    }
  }, [success, loading, user, navigate]);

  return (
    <div className="change-password">
      <h1>{t('changePasswordPage.title')}</h1>
      {error   && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <form onSubmit={handleSubmit}>
        <label>
          {t('changePasswordPage.currentPasswordLabel')}
          <input
            required
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
          />
        </label>

        <label>
          {t('changePasswordPage.newPasswordLabel')}
          <input
            required
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
        </label>

        <button type="submit">
          {t('changePasswordPage.submitButton')}
        </button>
      </form>
    </div>
  );
}
