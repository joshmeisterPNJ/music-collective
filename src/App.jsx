// src/App.jsx
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './AuthContext';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import EventsAdmin from './pages/EventsAdmin';
import UsersAdmin from './pages/UsersAdmin';
import MembersAdmin from './pages/MembersAdmin';
import MembersPage from './pages/MembersPage';
import MemberDetailPage from './pages/MemberDetailPage';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import AccountArchivedPage from './pages/AccountArchivedPage';
import AdminBar from './components/AdminBar';
import './App.css';

// Public-only: redirect logged-in users away from login
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/admin/events" replace /> : children;
}

// Protected: require auth and optional permission/super checks
function ProtectedRoute({ children, permission, superOnly }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password && window.location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  if (superOnly && user.role !== 'superadmin') {
    return <Navigate to="/" replace />;
  }
  if (permission && user.role !== 'superadmin' && !user.permissions.includes(permission)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// Global Navbar with i18n and language switcher
function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <nav className="main-nav">
      <ul>
        <li><Link to="/">{t('header.home')}</Link></li>
        <li><Link to="/events">{t('header.events')}</Link></li>
        <li><Link to="/members">{t('header.members')}</Link></li>

        {user && !user.must_change_password ? (
          <li>
            <button onClick={logout}>{t('header.logout')}</button>
          </li>
        ) : (
          <li>
            <Link to="/login">{t('header.login')}</Link>
          </li>
        )}

        <li className="lang-switch">
          <select
            value={i18n.language}
            onChange={e => i18n.changeLanguage(e.target.value)}
            aria-label={t('header.changeLanguage')}
          >
            <option value="en">EN</option>
            <option value="fr">FR</option>
          </select>
        </li>
      </ul>
    </nav>
  );
}

// App routes: public, auth, admin
function AppRoutes() {
  const { user } = useAuth();
  const showAdminBar =
    user &&
    (user.role === 'superadmin' || (user.permissions && user.permissions.length > 0));

  return (
    <>
      <Navbar />
      {showAdminBar && <AdminBar />}
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/members/:id" element={<MemberDetailPage />} />

        {/* Admin */}
        <Route path="/admin" element={<Navigate to="/admin/events" replace />} />
        <Route
          path="/admin/events"
          element={
            <ProtectedRoute permission="events">
              <EventsAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute superOnly>
              <UsersAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/members"
          element={
            <ProtectedRoute superOnly>
              <MembersAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/members/:id"
          element={
            <ProtectedRoute permission="members">
              <MembersAdmin />
            </ProtectedRoute>
          }
        />

        {/* Account archived */}
        <Route path="/account-archived" element={<AccountArchivedPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
