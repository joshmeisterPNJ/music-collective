// src/pages/UsersAdmin.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function UsersAdmin() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState(null);

  // ── Create-Admin form state & mutation ───────────────────────────
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('admin');
  const [newJoinDate, setNewJoinDate] = useState('');

  const createAdmin = useMutation({
    mutationFn: data => axios.post(`${API_BASE_URL}/api/auth/register`, data),
    onSuccess: () => {
      setMsg(t('usersAdmin.messages.adminCreated'));
      setNewUsername('');
      setNewPassword('');
      setNewRole('admin');
      setNewJoinDate('');
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: err =>
      setMsg(err.response?.data?.error || t('usersAdmin.messages.errorCreating')),
  });

  const handleCreate = e => {
    e.preventDefault();
    setMsg(null);
    createAdmin.mutate({
      username: newUsername,
      password: newPassword,
      role: newRole,
      join_date: newJoinDate,
    });
  };

  // ── Fetch existing admins ──────────────────────────────────────────
  const allPerms = ['events'];
  const { data: admins = [], isLoading, error, isFetching } = useQuery({
    queryKey: ['admins'],
    queryFn: () => axios.get(`${API_BASE_URL}/api/admins`).then(r => r.data),
  });

  // ── Optimistic toggle of permissions ──────────────────────────────
  const toggle = (adminId, permKey) =>
    queryClient.setQueryData(['admins'], old =>
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

  // ── Persist permissions to server ─────────────────────────────────
  const savePerms = useMutation({
    mutationFn: ({ adminId, permissions }) =>
      axios.patch(`${API_BASE_URL}/api/admins/${adminId}/permissions`, {
        permissionKeys: permissions,
      }),
    onSuccess: () => {
      setMsg(t('usersAdmin.messages.saved'));
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: () => setMsg(t('usersAdmin.messages.errorSaving')),
  });

  const save = (adminId, permissions) => {
    setMsg(null);
    savePerms.mutate({ adminId, permissions });
  };

  // ── Delete admin account ──────────────────────────────────────────
  const deleteAdmin = useMutation({
    mutationFn: id => axios.delete(`${API_BASE_URL}/api/admins/${id}`),
    onSuccess: () => {
      setMsg(t('usersAdmin.messages.adminDeleted'));
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: () => setMsg(t('usersAdmin.messages.deleteFailed')),
  });

  const handleDelete = id => {
    if (!confirm(t('usersAdmin.confirm.deleteAdmin'))) return;
    setMsg(null);
    deleteAdmin.mutate(id);
  };

  // ── Render ────────────────────────────────────────────────────────
  if (isLoading) return <p>{t('usersAdmin.loading')}</p>;
  if (error)     return <p>{t('usersAdmin.error')}</p>;

  const visibleAdmins = admins.filter(ad => ad.role !== 'superadmin');

  return (
    <div className="users-admin">
      <h1>{t('usersAdmin.title')}</h1>
      {msg        && <p>{msg}</p>}
      {isFetching && <p>{t('usersAdmin.messages.refreshing')}</p>}

      {/* Create Admin Form */}
      <form className="admin-form" onSubmit={handleCreate}>
        <h2>{t('usersAdmin.createSection.heading')}</h2>
        <label>
          {t('usersAdmin.createSection.usernameLabel')}
          <input
            required
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
          />
        </label>
        <label>
          {t('usersAdmin.createSection.passwordLabel')}
          <input
            required
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
        </label>
        <label>
          {t('usersAdmin.createSection.roleLabel')}
          <select
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
          >
            <option value="admin">
              {t('usersAdmin.createSection.roleAdmin', 'Admin')}
            </option>
            <option value="superadmin">
              {t('usersAdmin.createSection.roleSuperadmin', 'Superadmin')}
            </option>
          </select>
        </label>
        <label>
          {t('usersAdmin.createSection.joinDateLabel')}
          <input
            type="date"
            value={newJoinDate}
            onChange={e => setNewJoinDate(e.target.value)}
          />
        </label>
        <button type="submit">
          {t('usersAdmin.createSection.submitButton')}
        </button>
      </form>

      {/* Existing Admins Table */}
      <table>
        <thead>
          <tr>
            <th>{t('usersAdmin.table.usernameHeader')}</th>
            <th>{t('usersAdmin.table.roleHeader')}</th>
            {allPerms.map(p => (
              <th key={p}>{t(`usersAdmin.permissions.${p}`, p)}</th>
            ))}
            
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
                <button onClick={() => save(ad.id, ad.permissions)}>
                  {t('usersAdmin.table.saveHeader')}
                </button>
              </td>
              <td>
                <button onClick={() => handleDelete(ad.id)}>
                  {t('usersAdmin.table.deleteHeader')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
