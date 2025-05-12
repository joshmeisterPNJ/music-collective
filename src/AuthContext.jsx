// src/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import { API_BASE_URL } from "./config";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken]     = useState(() => localStorage.getItem("token"));
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Whenever token changes, configure axios and load user profile
  useEffect(() => {
    async function loadUser() {
      if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        try {
          const res = await axios.get(`${API_BASE_URL}/api/auth/me`);
          setUser(res.data);
        } catch (err) {
          console.error("Auth check failed:", err);
          setToken(null);
          setUser(null);
          localStorage.removeItem("token");
        }
      } else {
        delete axios.defaults.headers.common["Authorization"];
        setUser(null);
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  // login: persist, apply header, fetch /me
  const login = async (username, password) => {
    const res = await axios.post(
      `${API_BASE_URL}/api/auth/login`,
      { username, password }
    );
    const newToken = res.data.token;
    localStorage.setItem("token", newToken);
    setToken(newToken);
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    const me = await axios.get(`${API_BASE_URL}/api/auth/me`);
    setUser(me.data);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  // helper for other API calls
  const request = (method, path, data) =>
    axios({ method, url: `${API_BASE_URL}${path}`, data });

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, request, setToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
