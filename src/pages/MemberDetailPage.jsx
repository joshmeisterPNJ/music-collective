// src/pages/MemberDetailPage.jsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../AuthContext';
import ContactForm from '../components/ContactForm';
import './MemberDetailPage.css';

export default function MemberDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const { data: member, isLoading, error } = useQuery({
    queryKey: ['member', id],
    queryFn: () =>
      axios.get(`${API_BASE_URL}/api/public/members/${id}`)
           .then(res => res.data),
  });

  if (isLoading) return <p>Loading member…</p>;
  if (error)     return <p>Error loading member.</p>;

  const canEdit =
    user &&
    (user.role === 'superadmin' || user.id === member.admin_id);

  return (
    <div className="member-detail">
      {canEdit && (
        <Link to={`/admin/members/${id}`} className="edit-btn">
          Edit Profile
        </Link>
      )}

      <img
        className="member-banner"
        src={member.photo || '/assets/images/placeholder.JPG'}
        alt={member.name}
      />

      <h1>{member.name}</h1>
      <p className="member-location">
        {member.city}, {member.country}
      </p>

      {member.genres && <p className="member-genres">{member.genres}</p>}
      {member.bio    && <p className="member-bio">{member.bio}</p>}

      <div className="member-socials">
        {member.instagram  && (
          <a href={member.instagram}  target="_blank" rel="noreferrer">
            Instagram
          </a>
        )}
        {member.soundcloud && (
          <a href={member.soundcloud} target="_blank" rel="noreferrer">
            SoundCloud
          </a>
        )}
        {member.spotify    && (
          <a href={member.spotify}    target="_blank" rel="noreferrer">
            Spotify
          </a>
        )}
        {member.bandcamp   && (
          <a href={member.bandcamp}   target="_blank" rel="noreferrer">
            Bandcamp
          </a>
        )}
      </div>

      {member.soundcloud_embeds?.length > 0 && (
        <section className="member-embeds soundcloud-embeds">
          <h2>SoundCloud</h2>
          {member.soundcloud_embeds.map((code, i) =>
            code ? (
              <div
                key={i}
                className="embed-soundcloud"
                dangerouslySetInnerHTML={{ __html: code }}
              />
            ) : null
          )}
        </section>
      )}

      {member.spotify_embeds?.length > 0 && (
        <section className="member-embeds spotify-embeds">
          <h2>Spotify</h2>
          {member.spotify_embeds.map((code, i) =>
            code ? (
              <div
                key={i}
                className="embed-spotify"
                dangerouslySetInnerHTML={{ __html: code }}
              />
            ) : null
          )}
        </section>
      )}

      {(member.portfolio_description ||
        member.portfolio_link ||
        member.portfolio_images?.length > 0) && (
        <section className="member-portfolio">
          <h2>Portfolio</h2>
          {member.portfolio_description && (
            <p>{member.portfolio_description}</p>
          )}
          {member.portfolio_link && (
            <p>
              <a
                href={member.portfolio_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Work ↗
              </a>
            </p>
          )}
          {member.portfolio_images?.length > 0 && (
            <div className="portfolio-gallery">
              {member.portfolio_images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${member.name} portfolio ${i + 1}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="contact-member">
        <h2>Contact {member.name}</h2>
        <ContactForm memberId={id} />
      </section>
    </div>
  );
}
