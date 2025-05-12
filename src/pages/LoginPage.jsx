// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import "./LoginPage.css";

export default function LoginPage() {
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
      setErr("Invalid credentials");
    }
  };

  return (
    <div className="login-wrapper">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Collectif</h1>
        {err && <p className="error-msg">{err}</p>}

        <label>
          Username Joshmeister
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="joshmeister"
          />
        </label>

        <label>
          Password: AguguweKonami
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=""
          />
        </label>

        <button type="submit">Log In</button>
      </form>
    </div>
  );
}
