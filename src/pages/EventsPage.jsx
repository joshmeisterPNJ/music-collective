// src/pages/EventsPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import EventCard from '../components/EventCard';
import './eventspage.css';
import { API_BASE_URL } from '../config';

export default function EventsPage() {
  const { t, i18n } = useTranslation();
  const [viewType, setViewType] = useState('upcoming'); // 'upcoming' | 'past'

  const {
    data: events = [],
    isPending,
    error,
  } = useQuery({
    queryKey: ['events', viewType],
    queryFn: async () => {
      const res = await axios.get(
        `${API_BASE_URL}/api/events?type=${viewType}`
      );
      return res.data;
    },
    keepPreviousData: true,
  });

  return (
    <div className="events-page">
      <div className="event-tabs">
        <button
          className={viewType === 'upcoming' ? 'active' : ''}
          onClick={() => setViewType('upcoming')}
        >
          {t('eventsPage.upcoming')}
        </button>
        <button
          className={viewType === 'past' ? 'active' : ''}
          onClick={() => setViewType('past')}
        >
          {t('eventsPage.past')}
        </button>
      </div>

      <h1>
        {viewType === 'upcoming'
          ? t('eventsPage.upcomingTitle')
          : t('eventsPage.pastTitle')}
      </h1>

      {isPending && <p>{t('eventsPage.loading')}</p>}
      {error      && <p>{t('eventsPage.error')}</p>}

      <div className="events-list">
        {events.map(evt => (
          <EventCard
            key={evt.id}
            image={evt.image}
            title={evt.title}
            date={new Date(evt.date).toLocaleDateString(i18n.language)}
            description={evt.description}
          />
        ))}
      </div>
    </div>
  );
}
