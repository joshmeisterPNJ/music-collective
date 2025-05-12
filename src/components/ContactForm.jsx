// src/components/ContactForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function ContactForm({ memberId }) {
  const [inputs, setInputs] = useState({ name:'', email:'', message:'' });
  const [status, setStatus] = useState(null);

  const handleChange = e =>
    setInputs({ ...inputs, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setStatus(null);
    try {
      await axios.post(
        `${API_BASE_URL}/api/members/${memberId}/contact`,
        inputs
      );
      setStatus('Message sent!');
    } catch {
      setStatus('Failed to send.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {status && <p>{status}</p>}
      <label>
        Your Name
        <input name="name" value={inputs.name} onChange={handleChange} required/>
      </label>
      <label>
        Your Email
        <input
          name="email"
          type="email"
          value={inputs.email}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Message
        <textarea
          name="message"
          value={inputs.message}
          onChange={handleChange}
          required
        />
      </label>
      <button type="submit">Send</button>
    </form>
  );
}
