// src/pages/EventsAdmin.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './EventsAdmin.css';
import { API_BASE_URL } from '../config';

export default function EventsAdmin() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    date: '',
    description: '',
  });
  const [file, setFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB


  // Fetch & sort events: newest → oldest
  const {
    data: events = [],
    isFetching: listRefreshing,
  } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/api/events`);
      return [...res.data].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
    },
  });

  // Create or update an event
  const saveEvent = useMutation({
    mutationFn: ({ url, data, method }) =>
      axios({
        url,
        data,
        method,
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  // Delete an event
  const deleteEvent = useMutation({
    mutationFn: (id) => axios.delete(`${API_BASE_URL}/api/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleFileChange(e) {
    const f = e.target.files[0] ?? null;
    if (f && f.size > MAX_FILE_SIZE) {
      setMessage('Event image is too large. Max 10 MB.');
      setFile(null);
      e.target.value = '';          // clear the <input>
      return;
    }
    setFile(f);
  }
  

  function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    if (file && file.size > MAX_FILE_SIZE) {
      setMessage('Event image is too large. Max 10 MB.');
      return;
    }
    

    const data = new FormData();
    data.append('title', form.title);
    data.append('date', form.date);
    data.append('description', form.description);
    if (file) data.append('image', file);

    const method = editingId ? 'put' : 'post';
    const url = editingId
      ? `${API_BASE_URL}/api/events/${editingId}`
      : `${API_BASE_URL}/api/events`;

    saveEvent.mutate(
      { url, data, method },
      {
        onSuccess: () => {
          setMessage(editingId ? 'Updated!' : 'Created!');
          setForm({ title: '', date: '', description: '' });
          setFile(null);
          setEditingId(null);
        },
        onError: (err) => {
          setMessage(err.response?.data?.error || 'Error');
        },
      }
    );
  }

  function startEdit(evt) {
    setEditingId(evt.id);
    setForm({
      title: evt.title,
      date: evt.date.slice(0, 10),
      description: evt.description,
    });
    setFile(null);
    window.scrollTo(0, 0);
  }

  function handleDelete(id) {
    if (!confirm('Delete this event?')) return;
    deleteEvent.mutate(id, {
      onSuccess: () => setMessage('Deleted'),
      onError: () => setMessage('Delete failed'),
    });
  }

  return (
    <div className="admin-page">
      <h1>Events Admin</h1>
      {message && <p className="admin-message">{message}</p>}

      <form className="admin-form" onSubmit={handleSubmit}>
        <h2>{editingId ? 'Edit Event' : 'Create Event'}</h2>
        <label>
          Title
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Date
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Image File {editingId ? '(leave blank to keep current)' : ''}
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>
        <button type="submit">
          {editingId ? 'Save Changes' : 'Create Event'}
        </button>
      </form>

      <div className="admin-list">
        <h2>
          Existing Events{listRefreshing ? ' (refreshing…)' : ''}
        </h2>
        <ul>
          {events.map((evt) => (
            <li key={evt.id}>
              <img
                src={evt.image || '/assets/images/placeholder.JPG'}
                alt={evt.title}
                className="admin-thumb"
              />
              <span>
                {evt.title} ({new Date(evt.date).toLocaleDateString()})
              </span>
              <div className="admin-actions">
                <button onClick={() => startEdit(evt)}>Edit</button>
                <button onClick={() => handleDelete(evt.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}