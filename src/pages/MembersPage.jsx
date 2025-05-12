// src/pages/MembersPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './MembersPage.css';

export default function MembersPage() {
  const {
    data: members = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['publicMembers'],
    queryFn: () =>
      axios.get(`${API_BASE_URL}/api/public/members`).then(res => res.data),
  });

  if (isLoading) return <p>Loading members…</p>;
  if (error)    return <p>Error loading members.</p>;

  return (
    <div className="members-page">
      <h1>Members</h1>

      {/* use the CSS grid class */}
      <div className="members-grid">
        {members.map(member => (
          <Link
            key={member.id}
            to={`/members/${member.id}`}
            className="member-card"
          >
            {/* render image so your CSS .member-card img rules apply */}
            <img
              src={member.photo || '/placeholder.png'}
              alt={member.name}
            />

            <h2>{member.name}</h2>
            <p>
              {member.city && member.country
                ? `${member.city}, ${member.country}`
                : member.city || member.country || '—'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
