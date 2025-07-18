// src/pages/EventsAdmin.jsx
import React, { useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "./EventsAdmin.css";
import { API_BASE_URL } from "../config";

export default function EventsAdmin() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    date: "",
    description: "",
  });
  const [file, setFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  // Fetch & sort events: newest → oldest
  const { data: events = [], isFetching: listRefreshing } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/api/events`);
      return [...res.data].sort((a, b) => new Date(b.date) - new Date(a.date));
    },
  });

  // Create or update an event
  const saveEvent = useMutation({
    mutationFn: ({ url, data, method }) =>
      axios({
        url,
        data,
        method,
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setMessage(t(`eventsAdmin.message.${editingId ? "updated" : "created"}`));
      setForm({ title: "", date: "", description: "" });
      setFile(null);
      setEditingId(null);
    },
    onError: (err) =>
      setMessage(err.response?.data?.error || t("eventsAdmin.message.error")),
  });

  // Delete an event
  const deleteEvent = useMutation({
    mutationFn: (id) => axios.delete(`${API_BASE_URL}/api/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setMessage(t("eventsAdmin.message.deleted"));
    },
    onError: () => setMessage(t("eventsAdmin.message.deleteFailed")),
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleFileChange(e) {
    const f = e.target.files[0] ?? null;
    if (f && f.size > MAX_FILE_SIZE) {
      setMessage(t("eventsAdmin.message.imageTooLarge"));
      setFile(null);
      e.target.value = "";
      return;
    }
    setFile(f);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    if (file && file.size > MAX_FILE_SIZE) {
      setMessage(t("eventsAdmin.message.imageTooLarge"));
      return;
    }

    const data = new FormData();
    data.append("title", form.title);
    data.append("date", form.date);
    data.append("description", form.description);
    if (file) data.append("image", file);

    const method = editingId ? "put" : "post";
    const url = editingId
      ? `${API_BASE_URL}/api/events/${editingId}`
      : `${API_BASE_URL}/api/events`;

    saveEvent.mutate({ url, data, method });
  }

  function startEdit(evt) {
    setEditingId(evt.id);
    setForm({
      title: evt.title,
      date: evt.date.slice(0, 10),
      description: evt.description,
    });
    setFile(null);
    window.scrollTo(0, 0);
  }

  function handleDelete(id) {
    if (!confirm(t("eventsAdmin.confirm.deleteEvent"))) return;
    deleteEvent.mutate(id);
  }

  return (
    <div className="admin-page">
      <h1>{t("eventsAdmin.title")}</h1>
      {message && <p className="admin-message">{message}</p>}

      <form className="admin-form" onSubmit={handleSubmit}>
        <h2>
          {editingId
            ? t("eventsAdmin.form.editHeading")
            : t("eventsAdmin.form.createHeading")}
        </h2>
        <label>
          {t("eventsAdmin.form.labels.title")}
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          {t("eventsAdmin.form.labels.date")}
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          {t("eventsAdmin.form.labels.description")}
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          {t("eventsAdmin.form.labels.imageFile")}{" "}
          {editingId && `(${t("eventsAdmin.form.imageHelp")})`}
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>
        <button type="submit">
          {editingId
            ? t("eventsAdmin.form.submit.save")
            : t("eventsAdmin.form.submit.create")}
        </button>
      </form>

      <div className="admin-list">
        <h2>
          {t("eventsAdmin.existing.heading")}
          {listRefreshing && ` ${t("eventsAdmin.existing.refreshing")}`}
        </h2>
        <ul>
          {events.map((evt) => (
            <li key={evt.id}>
              {evt.image ? (
                <img src={evt.image} alt={evt.title} className="admin-thumb" />
              ) : (
                <div className="ph admin-thumb" aria-label="placeholder" />
              )}

              <span>
                {evt.title} (
                {new Date(evt.date).toLocaleDateString(i18n.language)})
              </span>
              <div className="admin-actions">
                <button onClick={() => startEdit(evt)}>
                  {t("eventsAdmin.actions.edit")}
                </button>
                <button onClick={() => handleDelete(evt.id)}>
                  {t("eventsAdmin.actions.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
