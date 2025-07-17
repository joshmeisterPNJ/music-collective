// src/components/ContactForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';

export default function ContactForm({ memberId }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setSending(true);

    try {
      await axios.post(`${API_BASE_URL}/api/public/members/${memberId}/contact`, form);
      setStatus('sent');
      setForm({ name: '', email: '', message: '' });
    } catch {
      setStatus('failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      {status === 'sent' && (
        <p className="status success">{t('contactForm.status.sent')}</p>
      )}
      {status === 'failed' && (
        <p className="status error">{t('contactForm.status.failed')}</p>
      )}

      <label>
        {t('contactForm.labels.name')}
        <input
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        {t('contactForm.labels.email')}
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        {t('contactForm.labels.message')}
        <textarea
          name="message"
          value={form.message}
          onChange={handleChange}
          required
        />
      </label>

      <button type="submit" disabled={sending}>
        {sending ? t('contactForm.status.sending', 'Sending…') : t('contactForm.button')}
      </button>
    </form>
  );
}
