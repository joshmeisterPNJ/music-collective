// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useTranslation } from "react-i18next";
import "./LoginPage.css";

export default function LoginPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);

  const landingFor = (user) => {
    if (user.role === "superadmin") return "/admin/events";
    const perms = user.permissions || [];
    if (perms.length === 0) return "/";
    return `/admin/${[...perms].sort()[0]}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      await auth.login(username, password);
      navigate(landingFor(auth.user), { replace: true });
    } catch {
      setErr(t("login.error.invalidCredentials"));
    }
  };

  return (
    <div className="login-wrapper">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>{t("login.title")}</h1>
        {err && <p className="error-msg">{err}</p>}

        <label>
          {t("login.usernameLabel")}
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("login.usernamePlaceholder")}
          />
        </label>

        <label>
          {t("login.passwordLabel")}
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("login.passwordPlaceholder")}
          />
        </label>

        <button type="submit">{t("login.button")}</button>
      </form>
    </div>
  );
}
