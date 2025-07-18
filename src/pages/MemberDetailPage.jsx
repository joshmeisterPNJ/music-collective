// src/pages/MemberDetailPage.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from "../config";
import { useAuth } from "../AuthContext";
import ContactForm from "../components/ContactForm";
import "./MemberDetailPage.css";

export default function MemberDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();

  const {
    data: member,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["member", id],
    queryFn: () =>
      axios
        .get(`${API_BASE_URL}/api/public/members/${id}`)
        .then((res) => res.data),
  });

  if (isLoading) return <p>{t("memberDetailPage.loading")}</p>;
  if (error) return <p>{t("memberDetailPage.error")}</p>;

  const canEdit =
    user && (user.role === "superadmin" || user.id === member.admin_id);

  return (
    <div className="member-detail">
      {canEdit && (
        <Link to={`/admin/members/${id}`} className="edit-btn">
          {t("memberDetailPage.editProfile")}
        </Link>
      )}

      {member.photo ? (
        <img className="member-banner" src={member.photo} alt={member.name} />
      ) : (
        <div className="ph member-banner" aria-label="placeholder" />
      )}

      <h1>{member.name}</h1>
      <p className="member-location">
        {member.city}, {member.country}
      </p>

      {member.genres && <p className="member-genres">{member.genres}</p>}
      {member.bio && <p className="member-bio">{member.bio}</p>}

      <div className="member-socials">
        {member.instagram && (
          <a href={member.instagram} target="_blank" rel="noreferrer">
            {t("memberDetailPage.socials.instagram")}
          </a>
        )}
        {member.soundcloud && (
          <a href={member.soundcloud} target="_blank" rel="noreferrer">
            {t("memberDetailPage.socials.soundcloud")}
          </a>
        )}
        {member.spotify && (
          <a href={member.spotify} target="_blank" rel="noreferrer">
            {t("memberDetailPage.socials.spotify")}
          </a>
        )}
        {member.bandcamp && (
          <a href={member.bandcamp} target="_blank" rel="noreferrer">
            {t("memberDetailPage.socials.bandcamp")}
          </a>
        )}
      </div>

      {member.soundcloud_embeds?.length > 0 && (
        <section className="member-embeds soundcloud-embeds">
          <h2>{t("memberDetailPage.sections.soundcloud")}</h2>
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
          <h2>{t("memberDetailPage.sections.spotify")}</h2>
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
          <h2>{t("memberDetailPage.sections.portfolio")}</h2>
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
                {t("memberDetailPage.portfolio.viewWork")}
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
        <h2>{t("memberDetailPage.contact", { name: member.name })}</h2>
        <ContactForm memberId={id} />
      </section>
    </div>
  );
}
