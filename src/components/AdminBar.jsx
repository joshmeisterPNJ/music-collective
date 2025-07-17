// src/components/AdminBar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import './AdminBar.css';

export default function AdminBar() {
  const { user } = useAuth();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  // ── Theme toggle state ─────────────────────────────────────────
  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark')
  );
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ── Early return if no admin perms ──────────────────────────────
  if (!user) return null;
  if (!user.permissions?.length && user.role !== 'superadmin') return null;

  // ── Paths & keys ───────────────────────────────────────────────
  const profilePath = `/admin/members/${user.id}`;
  const permToPath = {
    events:  '/admin/events',
    users:   '/admin/users',
    members: '/admin/members',
  };
  const keys =
    user.role === 'superadmin'
      ? ['profile', 'events', 'users', 'members']
      : ['profile', ...user.permissions.filter(p => p !== 'members' && permToPath[p])];

  return (
    <nav className="admin-bar">
      <ul>
        {keys.map(key => {
          const to    = key === 'profile' ? profilePath : permToPath[key];
          const label = t(`nav.${key}`);

          // ── Fix active state ────────────────────────────────────
          const active = (() => {
            if (key === 'profile') {
              return location.pathname === profilePath;
            }
            if (key === 'members') {
              return location.pathname === to;
            }
            return location.pathname.startsWith(to);
          })();

          return (
            <li key={key} className={active ? 'active' : ''}>
              <Link to={to}>{label}</Link>
            </li>
          );
        })}

        {/* ── Theme toggle ────────────────────────────────────────── */}
        <li className="theme-toggle">
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={t('nav.toggleTheme')}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </li>

      </ul>
    </nav>
  );
}
