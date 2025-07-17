// src/pages/MembersPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';
import './MembersPage.css';

export default function MembersPage() {
  const { t } = useTranslation();

  const {
    data: members = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['publicMembers'],
    queryFn: () =>
      axios.get(`${API_BASE_URL}/api/public/members`).then(res => res.data),
  });

  if (isLoading) return <p>{t('membersPage.loading')}</p>;
  if (error)    return <p>{t('membersPage.error')}</p>;

  return (
    <div className="members-page">
      <h1>{t('membersPage.title')}</h1>

      <div className="members-grid">
        {members.map(member => (
          <Link
            key={member.id}
            to={`/members/${member.id}`}
            className="member-card"
          >
            {member.photo ? (
              <img src={member.photo} alt={member.name} />
            ) : (
              <div className="ph" />
            )}

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
