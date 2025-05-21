// ─────────────────────── src/pages/MembersAdmin.jsx ───────────────────────
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { API_BASE_URL } from '../config';
import { uploadToR2 }   from '../utils/uploadR2';   // helper already in repo :contentReference[oaicite:0]{index=0}
import { useAuth }      from '../AuthContext';

import './MembersAdmin.css';

export default function MembersAdmin() {
  // ─── Auth / routing helpers ───────────────────────────────────────────
  const { user }      = useAuth();
  const { id: param } = useParams();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();

  const isSuper = user.role === 'superadmin';
  const isOwn   = param === String(user.id);
  const editId  = isSuper && !isOwn && param ? param : user.id;

  // ─── Fetch list (super-only) + single member ──────────────────────────
  const { data: members = [], isFetching: listFetching } = useQuery({
    queryKey: ['members'],
    queryFn:  () => axios.get(`${API_BASE_URL}/api/members`).then(r => r.data),
    enabled:  isSuper && !isOwn,
  });

  const {
    data: single,
    isFetching: memberLoading,
    error: memberError,
  } = useQuery({
    queryKey: ['member', editId],
    queryFn:  () => axios.get(`${API_BASE_URL}/api/members/${editId}`).then(r => r.data),
    enabled:  !!editId,
  });

  // ─── Local state ──────────────────────────────────────────────────────
  const [message, setMessage] = useState(null);
  const [saving,  setSaving]  = useState(false);

  const emptyForm = {
    name: '', role: '', genres: '', bio: '', email: '',
    city: '', country: '',
    instagram: '', soundcloud: '', spotify: '', bandcamp: '',
    photo: null,
    portfolio_link: '',
    portfolio_description: '',
    portfolio_images: [],
    soundcloud_embeds: ['', '', ''],
    spotify_embeds:    ['', '', ''],
  };
  const [form, setForm] = useState(emptyForm);

  // ─── Mutations ────────────────────────────────────────────────────────
  const saveMember = useMutation({
    mutationFn: payload =>
      axios.put(`${API_BASE_URL}/api/members/${editId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member', editId] });
      setMessage('Member updated!');
    },
    onError: err =>
      setMessage(err.response?.data?.error || 'Update failed'),
  });

  const deleteMember = useMutation({
    mutationFn: id => axios.delete(`${API_BASE_URL}/api/members/${id}`),
    onSuccess: () => {
      setMessage('Member deleted');
      queryClient.invalidateQueries({ queryKey: ['members'] });
      navigate('/admin/members');
    },
    onError: () => setMessage('Delete failed'),
  });

  // ─── Populate form when data loads ────────────────────────────────────
  useEffect(() => {
    if (single) {
      setForm(f => ({
        ...f,
        ...single,
        photo: null,
        portfolio_images: [],
      }));
    }
  }, [single]);

  // ─── Conditional redirect if the member was deleted ───────────────────
  if (memberError?.response?.status === 404) {
    return <Navigate to="/account-archived" replace />;
  }

  // ─── Loading states ───────────────────────────────────────────────────
  if (isSuper && !isOwn && listFetching)   return <p>Loading members…</p>;
  if ((!isSuper || isOwn) && memberLoading) return <p>Loading member…</p>;

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleChange = e =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange     = e =>
    setForm({ ...form, photo: e.target.files[0] });

  const handlePortfolioFiles = e =>
    setForm({ ...form, portfolio_images: Array.from(e.target.files) });

  const startEdit    = m  => navigate(`/admin/members/${m.id}`);
  const handleDelete = id => {
    if (confirm('Delete this member?')) deleteMember.mutate(id);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
  
    try {
      // 1) client-side size guard
      if (form.photo && form.photo.size > 10 * 1024 * 1024) {
        throw new Error("Profile photo is too large. Max 10 MB.");
      }
      for (let img of form.portfolio_images) {
        if (img.size > 10 * 1024 * 1024) {
          throw new Error("One of the portfolio images is too large. Max 10 MB.");
        }
      }
  
      // 2) upload to R2
      let photoUrl = null;
      if (form.photo) {
        photoUrl = await uploadToR2(form.photo);
      }
  
      let portfolioUrls = [];
      if (form.portfolio_images.length) {
        portfolioUrls = await Promise.all(
          form.portfolio_images.map(uploadToR2)
        );
      }
  
      // 3) save via API
      const payload = {
        ...form,
        photo:            photoUrl,
        portfolio_images: portfolioUrls,
      };
      await saveMember.mutateAsync(payload);
  
      // 4) redirect to public profile
      navigate(`/members/${editId}`, { replace: true });
  
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };  

  // ─── Render helpers ──────────────────────────────────────────────────
  const baseFields = [
    ['name', 'Name'], ['role', 'Artist Role'], ['genres', 'Genres'],
    ['bio', 'Bio'],   ['email', 'Email'],      ['city', 'City'],
    ['country', 'Country'],
    ['instagram', 'Instagram URL'], ['soundcloud', 'SoundCloud URL'],
    ['spotify', 'Spotify URL'],     ['bandcamp', 'Bandcamp URL'],
  ];

  // ─── JSX ──────────────────────────────────────────────────────────────
  return (
    <div className="admin-page">
      {message && <p className="admin-message">{message}</p>}

      {isSuper && !isOwn && (
        <div className="admin-list">
          <h2>Members {listFetching && '(refreshing…)'} </h2>
          <ul>
            {members.map(m => (
              <li key={m.id}>
                <span>{m.name} — {m.role} ({m.city}, {m.country})</span>
                <div className="admin-actions">
                  <button onClick={() => startEdit(m)}>Edit</button>
                  <button onClick={() => handleDelete(m.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="admin-form" onSubmit={handleSubmit}>
        <h2>{isSuper && !isOwn ? 'Edit Member' : 'Edit Your Profile'}</h2>

        {baseFields.map(([key, label]) => (
          <label key={key}>
            {label}
            {key === 'bio' ? (
              <textarea name={key} value={form[key]} onChange={handleChange} />
            ) : (
              <input name={key} value={form[key]} onChange={handleChange} />
            )}
          </label>
        ))}

        <label>Profile Photo
          <input type="file" accept="image/*" onChange={handleFileChange}/>
        </label>

        <label>Portfolio Link
          <input name="portfolio_link" value={form.portfolio_link} onChange={handleChange}/>
        </label>

        <label>Portfolio Description
          <textarea
            name="portfolio_description"
            value={form.portfolio_description}
            onChange={handleChange}
          />
        </label>

        <label>Portfolio Images (up to 10)
          <input type="file" accept="image/*" multiple onChange={handlePortfolioFiles}/>
        </label>

        <fieldset>
          <legend>SoundCloud Embeds (max 3)</legend>
          {form.soundcloud_embeds.map((val, i) => (
            <label key={i}>Embed #{i + 1}
              <textarea
                value={val}
                onChange={e => {
                  const next = [...form.soundcloud_embeds];
                  next[i] = e.target.value;
                  setForm({ ...form, soundcloud_embeds: next });
                }}
              />
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Spotify Embeds (max 3)</legend>
          {form.spotify_embeds.map((val, i) => (
            <label key={i}>Embed #{i + 1}
              <textarea
                value={val}
                onChange={e => {
                  const next = [...form.spotify_embeds];
                  next[i] = e.target.value;
                  setForm({ ...form, spotify_embeds: next });
                }}
              />
            </label>
          ))}
        </fieldset>

        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
