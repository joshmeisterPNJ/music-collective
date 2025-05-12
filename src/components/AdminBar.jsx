// src/components/AdminBar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './AdminBar.css';

export default function AdminBar() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;
  if (!user.permissions?.length && user.role !== 'superadmin') return null;

  const profilePath = `/admin/members/${user.id}`;
  const permToPath = {
    events:  '/admin/events',
    users:   '/admin/users',
    members: '/admin/members',
  };

  let keys;
  if (user.role === 'superadmin') {
    keys = ['profile', 'events', 'users', 'members'];
  } else {
    // regular admins only get their own profile link
    keys = ['profile', 
      ...user.permissions.filter(p => p !== 'members' && permToPath[p])
    ];
  }

  return (
    <nav className="admin-bar">
      <ul>
        {keys.map(key => {
          const to    = key === 'profile' ? profilePath : permToPath[key];
          const label = key === 'profile'
            ? 'My Profile'
            : key.charAt(0).toUpperCase() + key.slice(1);
          const active = key === 'profile'
            ? location.pathname === profilePath
            : location.pathname.startsWith(to);
          return (
            <li key={key} className={active ? 'active' : ''}>
              <Link to={to}>{label}</Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
