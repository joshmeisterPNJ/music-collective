// src/App.jsx
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './AuthContext';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import EventsAdmin from './pages/EventsAdmin';
import UsersAdmin from './pages/UsersAdmin';
import MembersAdmin from './pages/MembersAdmin';
import MembersPage from './pages/MembersPage';
import MemberDetailPage from './pages/MemberDetailPage';
import AccountArchivedPage from './pages/AccountArchivedPage';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import AdminBar from './components/AdminBar';

import './App.css';

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/admin/events" replace /> : children;
}

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

function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav>
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/events">Events</Link></li>
        <li><Link to="/members">Members</Link></li>
        {user && !user.must_change_password ? (
          <li><button onClick={logout}>Log Out</button></li>
        ) : (
          <li><Link to="/login">Log In</Link></li>
        )}
      </ul>
    </nav>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const showAdminBar =
    user &&
    (user.role === 'superadmin' ||
      (user.permissions && user.permissions.length > 0));

  return (
    <>
      <Navbar />
      {showAdminBar && <AdminBar />}
      <Routes>
        {/* Public routes */}
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

        {/* Public Members */}
        <Route path="/members" element={<MembersPage />} />
        <Route path="/members/:id" element={<MemberDetailPage />} />

        {/* Admin routes */}
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

        {/* Account-Archived */}
        <Route path="/account-archived" element={<AccountArchivedPage />} />

        {/* Catch-all */}
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
