// src/pages/EventsPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import EventCard from '../components/EventCard';
import './eventspage.css';
import { API_BASE_URL } from '../config';

const EventsPage = () => {
  const [viewType, setViewType] = useState('upcoming'); // 'upcoming' | 'past'

  // v5 object-style useQuery
  const {
    data: events = [],
    isPending,          // replaces isLoading
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
          Upcoming
        </button>
        <button
          className={viewType === 'past' ? 'active' : ''}
          onClick={() => setViewType('past')}
        >
          Past
        </button>
      </div>

      <h1>{viewType === 'upcoming' ? 'Upcoming Events' : 'Past Events'}</h1>

      {isPending && <p>Loading events…</p>}
      {error   && <p>{error.message || 'Failed to load events'}</p>}

      <div className="events-list">
        {events.map(evt => (
          <EventCard
            key={evt.id}
            image={evt.image}
            title={evt.title}
            date={new Date(evt.date).toLocaleDateString()}
            description={evt.description}
          />
        ))}
      </div>
    </div>
  );
};

export default EventsPage;
