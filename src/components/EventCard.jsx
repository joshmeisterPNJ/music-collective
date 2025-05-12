// src/components/EventCard.jsx
import React from 'react';
import './EventCard.css';

const EventCard = ({ image, title, date, description }) => {
  // Fallback to placeholder if no image provided
  const imageUrl = image || '/assets/images/placeholder.JPG';

  return (
    <div className="event-card">
      {/* Image wrapper matching your CSS */}
      <div className="event-card-image">
        <img src={imageUrl} alt={title} />
      </div>

      {/* Details wrapper matching your CSS */}
      <div className="event-card-info">
        <h2>{title}</h2>
        {/* date and description get their own classes too */}
        <p className="event-date">{date}</p>
        <p className="event-description">{description}</p>
      </div>
    </div>
  );
};

export default EventCard;
