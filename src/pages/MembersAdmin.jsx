// src/pages/MembersAdmin.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../AuthContext';
import './MembersAdmin.css';

export default function MembersAdmin() {
  const { user } = useAuth();
  const { id: paramId } = useParams();            // /admin/members/:id
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isSuper = user.role === 'superadmin';
  const isOwn   = paramId === String(user.id);
  const editId  = isSuper && !isOwn && paramId ? paramId : user.id;

  // Fetch members list for super-admin
  const { data: members = [], isFetching: listFetching } = useQuery({
    queryKey: ['members'],
    queryFn: () => axios.get(`${API_BASE_URL}/api/members`).then(r => r.data),
    enabled: isSuper && !isOwn,
  });

  // Fetch single member data
  const { data: single, 
    isFetching: memberLoading ,
    error: memberError
  } = useQuery({
    queryKey: ['member', editId],
    queryFn: () => 
      axios.get(`${API_BASE_URL}/api/members/${editId}`)
           .then(r => r.data),
    enabled: !!editId,
  });


  // Form state
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({
    name: '',
    role: '',
    genres: '',
    bio: '',
    email: '',
    city: '',
    country: '',
    instagram: '',
    soundcloud: '',
    spotify: '',
    bandcamp: '',
    photo: null,
    portfolio_link: '',
    portfolio_description: '',
    portfolio_images: [],
    soundcloud_embeds: ['', '', ''],
    spotify_embeds:    ['', '', ''],
  });

  // Populate form when single member data arrives
  useEffect(() => {
    if (single) {
      setForm({
        name: single.name ?? '',
        role: single.role ?? '',
        genres: single.genres ?? '',
        bio: single.bio ?? '',
        email: single.email ?? '',
        city: single.city ?? '',
        country: single.country ?? '',
        instagram: single.instagram ?? '',
        soundcloud: single.soundcloud ?? '',
        spotify: single.spotify ?? '',
        bandcamp: single.bandcamp ?? '',
        photo: null,
        portfolio_link: single.portfolio_link ?? '',
        portfolio_description: single.portfolio_description ?? '',
        portfolio_images: [],
        soundcloud_embeds: single.soundcloud_embeds ?? ['', '', ''],
        spotify_embeds:    single.spotify_embeds    ?? ['', '', ''],
      });
    }
  }, [single]);

  // Mutations
  const saveMember = useMutation({
    mutationFn: data =>
      axios.put(
        `${API_BASE_URL}/api/members/${editId}`,
        data,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries(['members']);
      queryClient.invalidateQueries(['member', editId]);
      navigate(`/members/${editId}`); // public profile after save
      setMessage('Profile updated!');
    },
    onError: () => setMessage('Error updating member'),
  });

  const deleteMember = useMutation({
    mutationFn: id => axios.delete(`${API_BASE_URL}/api/members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['members']);
      setMessage('Deleted');
    },
    onError: () => setMessage('Error deleting member'),
  });

  // Handlers
  const handleChange = e =>
    setForm({ ...form, [e.target.name]: e.target.value });
  const handleFileChange = e =>
    setForm({ ...form, photo: e.target.files[0] });
  const handlePortfolioFiles = e =>
    setForm({ ...form, portfolio_images: [...e.target.files] });
  const handleEmbedChange = (platform, idx, value) => {
    const key = platform === 'sc' ? 'soundcloud_embeds' : 'spotify_embeds';
    const arr = [...form[key]];
    arr[idx] = value;
    setForm({ ...form, [key]: arr });
  };

  const handleSubmit = e => {
    e.preventDefault();
    setMessage(null);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'photo' && v) {
        fd.append('photo', v);
      } else if (k === 'portfolio_images' && Array.isArray(v)) {
        v.forEach(file => fd.append('portfolio_images', file));
      } else if (k === 'soundcloud_embeds' || k === 'spotify_embeds') {
        fd.append(k, JSON.stringify(v));
      } else {
        fd.append(k, v);
      }
    });
    saveMember.mutate(fd);
  };

  const startEdit = m => navigate(`/admin/members/${m.id}`);
  const handleDelete = id => {
    if (confirm('Delete this member?')) deleteMember.mutate(id);
  };

  // Loading states
  if (isSuper && !isOwn && listFetching) return <p>Loading members…</p>;
  if ((!isSuper || isOwn) && memberLoading)     return <p>Loading member…</p>;
  if (memberError?.response?.status === 404) {
    return <Navigate to="/account-archived" replace />;
  }

  const baseFields = [
    ['name', 'Name'],
    ['role', 'Artist Role'],
    ['genres', 'Genres'],
    ['bio', 'Bio'],
    ['email', 'Email'],
    ['city', 'City'],
    ['country', 'Country'],
    ['instagram', 'Instagram URL'],
    ['soundcloud', 'SoundCloud URL'],
    ['spotify', 'Spotify URL'],
    ['bandcamp', 'Bandcamp URL'],
  ];

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
                  {isSuper && <button onClick={() => handleDelete(m.id)}>Delete</button>}
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

        <label>
          Profile Photo
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>

        <label>
          Portfolio Link
          <input
            name="portfolio_link"
            type="text"
            value={form.portfolio_link}
            onChange={handleChange}
          />
        </label>
        <label>
          Portfolio Description
          <textarea
            name="portfolio_description"
            value={form.portfolio_description}
            onChange={handleChange}
          />
        </label>

        <label>
          Portfolio Images (up to 10)
          <input type="file" accept="image/*" multiple onChange={handlePortfolioFiles} />
        </label>

        <fieldset>
          <legend>SoundCloud Embeds (up to 3)</legend>
          {[0,1,2].map(i => (
            <label key={i}>
              Embed #{i+1}
              <textarea
                value={form.soundcloud_embeds[i]}
                onChange={e => handleEmbedChange('sc', i, e.target.value)}
              />
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Spotify Embeds (up to 3)</legend>
          {[0,1,2].map(i => (
            <label key={i}>
              Embed #{i+1}
              <textarea
                value={form.spotify_embeds[i]}
                onChange={e => handleEmbedChange('sp', i, e.target.value)}
              />
            </label>
          ))}
        </fieldset>

        <button type="submit">Save Changes</button>
      </form>
    </div>
  );
}
