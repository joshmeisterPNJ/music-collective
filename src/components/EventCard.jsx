// src/components/EventCard.jsx
import React from 'react';
import './EventCard.css';

const EventCard = ({ image, title, date, description }) => {
  return (
    <div className="event-card">
      {/* Image (or grey placeholder) */}
      <div className="event-card-image">
        {image ? (
          <img src={image} alt={title} />
        ) : (
          <div className="ph" />
        )}
      </div>

      {/* Details */}
      <div className="event-card-info">
        <h2>{title}</h2>
        <p className="event-date">{date}</p>
        <p className="event-description">{description}</p>
      </div>
    </div>
  );
};

export default EventCard;
