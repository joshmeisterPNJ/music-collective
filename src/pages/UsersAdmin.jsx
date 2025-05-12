// src/pages/UsersAdmin.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function UsersAdmin() {
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState(null);

  // ─── Create-Admin form state & mutation ──────────────────────────
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole,     setNewRole]     = useState('admin');
  const [newJoinDate, setNewJoinDate] = useState('');

  const createAdmin = useMutation({
    mutationFn: data =>
      axios.post(`${API_BASE_URL}/api/auth/register`, data),
    onSuccess: () => {
      setMsg('Admin created!');
      setNewUsername('');
      setNewPassword('');
      setNewRole('admin');
      setNewJoinDate('');
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: err =>
      setMsg(err.response?.data?.error || 'Error creating admin'),
  });

  const handleCreate = e => {
    e.preventDefault();
    setMsg(null);
    createAdmin.mutate({
      username:  newUsername,
      password:  newPassword,
      role:      newRole,
      join_date: newJoinDate,
    });
  };

  // ─── Permissions & users fetch ───────────────────────────────────
  const allPerms = ['events'];
  const {
    data: admins = [],
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/api/admins`);
      return res.data;
    },
  });

  // ─── Toggle permission locally ───────────────────────────────────
  const toggle = (adminId, permKey) => {
    queryClient.setQueryData(['admins'], (old = []) =>
      old.map(ad =>
        ad.id === adminId
          ? {
              ...ad,
              permissions: ad.permissions.includes(permKey)
                ? ad.permissions.filter(p => p !== permKey)
                : [...ad.permissions, permKey],
            }
          : ad
      )
    );
  };

  // ─── Save permissions to server ──────────────────────────────────
  const savePerms = useMutation({
    mutationFn: ({ adminId, permissions }) =>
      axios.patch(`${API_BASE_URL}/api/admins/${adminId}/permissions`, {
        permissionKeys: permissions,
      }),
    onSuccess: () => {
      setMsg('Saved!');
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: () => setMsg('Error'),
  });

  const save = (adminId, permissions) => {
    setMsg(null);
    savePerms.mutate({ adminId, permissions });
  };

  // ─── Delete admin account ────────────────────────────────────────
  const deleteAdmin = useMutation({
    mutationFn: id => axios.delete(`${API_BASE_URL}/api/admins/${id}`),
    onSuccess: () => {
      setMsg('Admin deleted');
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: () => setMsg('Delete failed'),
  });

  const handleDelete = id => {
    if (!confirm('Delete this admin?')) return;
    setMsg(null);
    deleteAdmin.mutate(id);
  };

  // ─── Render logic ────────────────────────────────────────────────
  if (isLoading) return <p>Loading users…</p>;
  if (error)     return <p>Error loading users</p>;

  // hide super-admin from list
  const visibleAdmins = admins.filter(ad => ad.role !== 'superadmin');

  return (
    <div className="users-admin">
      <h1>User Management</h1>
      {msg        && <p>{msg}</p>}
      {isFetching && <p>Refreshing…</p>}

      {/* Create Admin Form */}
      <form className="admin-form" onSubmit={handleCreate}>
        <h2>Create New Admin</h2>
        <label>
          Username
          <input
            required
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            required
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
        </label>
        <label>
          Role
          <select
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
          >
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </label>
        <label>
          Join Date
          <input
            type="date"
            value={newJoinDate}
            onChange={e => setNewJoinDate(e.target.value)}
          />
        </label>
        <button type="submit">Create Admin</button>
      </form>

      {/* Existing Admins Table */}
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            {allPerms.map(p => <th key={p}>{p}</th>)}
            <th>Save</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {visibleAdmins.map(ad => (
            <tr key={ad.id}>
              <td>{ad.username}</td>
              <td>{ad.role}</td>
              {allPerms.map(p => (
                <td key={p}>
                  <input
                    type="checkbox"
                    checked={ad.permissions.includes(p)}
                    onChange={() => toggle(ad.id, p)}
                  />
                </td>
              ))}
              <td>
                <button onClick={() => save(ad.id, ad.permissions)}>💾</button>
              </td>
              <td>
                <button onClick={() => handleDelete(ad.id)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
