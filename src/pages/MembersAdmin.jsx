// src/pages/MembersAdmin.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useTranslation } from "react-i18next";

import { API_BASE_URL } from "../config";
import { uploadToR2 } from "../utils/uploadR2";
import { useAuth } from "../AuthContext";

import "./MembersAdmin.css";

export default function MembersAdmin() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id: param } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isSuper = user.role === "superadmin";
  const isOwn = param === String(user.id);
  const editId = isSuper && !isOwn && param ? param : user.id;

  /* ──────────────── queries ──────────────── */
  const { data: members = [], isFetching: listFetching } = useQuery({
    queryKey: ["members"],
    queryFn: () => axios.get(`${API_BASE_URL}/api/members`).then((r) => r.data),
    enabled: isSuper && !isOwn,
  });

  const {
    data: single,
    isFetching: memberLoading,
    error: memberError,
  } = useQuery({
    queryKey: ["member", editId],
    queryFn: () =>
      axios.get(`${API_BASE_URL}/api/members/${editId}`).then((r) => r.data),
    enabled: !!editId,
  });

  /* ─────────────── local state ───────────── */
  const emptyForm = {
    name: "",
    role: "",
    genres: "",
    bio: "",
    email: "",
    city: "",
    country: "",
    instagram: "",
    soundcloud: "",
    spotify: "",
    bandcamp: "",
    photo: null,
    portfolio_link: "",
    portfolio_description: "",
    portfolio_images: [],
    soundcloud_embeds: ["", "", ""],
    spotify_embeds: ["", "", ""],
  };
  const [form, setForm] = useState(emptyForm);
  const [message, setMsg] = useState(null);
  const [saving, setSav] = useState(false);

  /* ─────── populate & NORMALISE incoming member ─────── */
  useEffect(() => {
    if (!single) return;

    const cleaned = { ...single };

    // convert null → '' for text inputs
    [
      "name",
      "role",
      "genres",
      "bio",
      "email",
      "city",
      "country",
      "instagram",
      "soundcloud",
      "spotify",
      "bandcamp",
      "portfolio_link",
      "portfolio_description",
    ].forEach((k) => {
      if (cleaned[k] == null) cleaned[k] = "";
    });

    // ensure the embed arrays always exist & have length 3
    const ensureEmbeds = (key) => {
      if (!Array.isArray(cleaned[key])) cleaned[key] = ["", "", ""];
      cleaned[key] = cleaned[key].map((v) => v ?? "");
      while (cleaned[key].length < 3) cleaned[key].push("");
    };
    ensureEmbeds("soundcloud_embeds");
    ensureEmbeds("spotify_embeds");

    setForm((f) => ({ ...f, ...cleaned, photo: null, portfolio_images: [] }));
  }, [single]);

  /* ─────────────── mutations ─────────────── */
  const saveMember = useMutation({
    mutationFn: (payload) =>
      axios.put(`${API_BASE_URL}/api/members/${editId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["members"]);
      queryClient.invalidateQueries(["member", editId]);
      setMsg(t("membersAdmin.messages.updated"));
      navigate(`/members/${editId}`, { replace: true });
    },
    onError: (err) =>
      setMsg(
        err.response?.data?.error || t("membersAdmin.messages.errorUpdate")
      ),
  });

  const deleteMember = useMutation({
    mutationFn: () => axios.delete(`${API_BASE_URL}/api/members/${editId}`),
    onSuccess: () => navigate("/admin/members"),
    onError: () => setMsg(t("membersAdmin.messages.errorDelete")),
  });

  /* ─────────────── early exits ────────────── */
  if (memberError?.response?.status === 404)
    return <Navigate to="/account-archived" replace />;

  if (isSuper && !isOwn && listFetching)
    return <p>{t("membersAdmin.loadingList")}</p>;
  if ((!isSuper || isOwn) && memberLoading)
    return <p>{t("membersAdmin.loadingSingle")}</p>;

  /* ─────────────── handlers ──────────────── */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });
  const handleFileChange = (e) =>
    setForm({ ...form, photo: e.target.files[0] });
  const handlePortfolioFile = (e) =>
    setForm({ ...form, portfolio_images: Array.from(e.target.files) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setSav(true);
    try {
      // size guard 10 MB
      const overSize = [...form.portfolio_images, form.photo]
        .filter(Boolean)
        .some((f) => f.size > 10 * 1024 * 1024);
      if (overSize) throw new Error(t("membersAdmin.form.errorFileTooLarge"));

      const photoUrl = form.photo ? await uploadToR2(form.photo) : null;
      const portfolioUrls = form.portfolio_images.length
        ? await Promise.all(form.portfolio_images.map(uploadToR2))
        : [];

      await saveMember.mutateAsync({
        ...form,
        photo: photoUrl,
        portfolio_images: portfolioUrls,
      });
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSav(false);
    }
  };

  /* ─────────────── render ──────────────── */

  const baseFields = [
    [
      "name",
      "role",
      "genres",
      "bio",
      "email",
      "city",
      "country",
      "instagram",
      "soundcloud",
      "spotify",
      "bandcamp",
    ].map((k) => [k, t(`membersAdmin.form.labels.${k}`)]),
  ].flat();

  return (
    <div className="admin-page">
      {message && <p className="admin-message">{message}</p>}

      {isSuper && !isOwn && (
        <div className="admin-list">
          <h2>{t("membersAdmin.list.heading")}</h2>
          <ul>
            {members.map((m) => (
              <li key={m.id}>
                {m.photo ? (
                  <img src={m.photo} alt={m.name} className="admin-thumb" />
                ) : (
                  <div className="ph admin-thumb" aria-label="placeholder" />
                )}
                <span>
                  {m.name} — {m.role}
                </span>
                <div className="admin-actions">
                  <button onClick={() => navigate(`/admin/members/${m.id}`)}>
                    {t("membersAdmin.actions.edit")}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(t("membersAdmin.confirm.deleteMember")))
                        deleteMember.mutate();
                    }}
                  >
                    {t("membersAdmin.actions.delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="admin-form" onSubmit={handleSubmit}>
        <h2>{t("membersAdmin.form.editMember")}</h2>

        {baseFields.map(([key, label]) => (
          <label key={key}>
            {label}
            {key === "bio" ? (
              <textarea name={key} value={form[key]} onChange={handleChange} />
            ) : (
              <input name={key} value={form[key]} onChange={handleChange} />
            )}
          </label>
        ))}

        <label>
          {t("membersAdmin.form.labels.profilePhoto")}
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>

        <label>
          {t("membersAdmin.form.labels.portfolioLink")}
          <input
            name="portfolio_link"
            value={form.portfolio_link}
            onChange={handleChange}
          />
        </label>

        <label>
          {t("membersAdmin.form.labels.portfolioDescription")}
          <textarea
            name="portfolio_description"
            value={form.portfolio_description}
            onChange={handleChange}
          />
        </label>

        <label>
          {t("membersAdmin.form.labels.portfolioImages")}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePortfolioFile}
          />
        </label>

        <fieldset>
          <legend>{t("membersAdmin.form.fieldsets.soundcloudLegend")}</legend>
          {form.soundcloud_embeds.map((v, i) => (
            <label key={i}>
              {t("membersAdmin.form.fieldsets.embedLabel", { count: i + 1 })}
              <textarea
                value={v}
                onChange={(e) => {
                  const next = [...form.soundcloud_embeds];
                  next[i] = e.target.value;
                  setForm({ ...form, soundcloud_embeds: next });
                }}
              />
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>{t("membersAdmin.form.fieldsets.spotifyLegend")}</legend>
          {form.spotify_embeds.map((v, i) => (
            <label key={i}>
              {t("membersAdmin.form.fieldsets.embedLabel", { count: i + 1 })}
              <textarea
                value={v}
                onChange={(e) => {
                  const next = [...form.spotify_embeds];
                  next[i] = e.target.value;
                  setForm({ ...form, spotify_embeds: next });
                }}
              />
            </label>
          ))}
        </fieldset>

        <button type="submit" disabled={saving}>
          {saving
            ? t("membersAdmin.form.saving")
            : t("membersAdmin.form.submitButton")}
        </button>
      </form>
    </div>
  );
}
