import { createContext, useContext, useEffect, useMemo, useState } from "react";
import apiClient from "../utils/apiClient";
import {
  clearSession,
  getStoredUser,
  persistSession,
} from "./authStorage";

const AuthContext = createContext(null);

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const authRequest = async (config) => {
  try {
    const response = await apiClient(config);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Request failed."));
  }
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvide = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const data = await authRequest({
          url: "/api/auth/me",
          method: "GET",
        });
        setCurrentUser(data.user);
        persistSession(data.user);
      } catch {
        clearSession();
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const registerUser = async (username, password) => {
    const data = await authRequest({
      url: "/api/auth/register",
      method: "POST",
      data: { username, password },
    });

    persistSession(data.user);
    setCurrentUser(data.user);

    return data.user;
  };

  const loginUser = async (username, password) => {
    const data = await authRequest({
      url: "/api/auth/login",
      method: "POST",
      data: { username, password },
    });

    persistSession(data.user);
    setCurrentUser(data.user);

    return data.user;
  };

  const logout = async () => {
    try {
      await authRequest({
        url: "/api/auth/logout",
        method: "POST",
      });
    } catch {
      // Local cleanup is enough even if the logout request fails.
    } finally {
      clearSession();
      setCurrentUser(null);
    }
  };

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      isAuthenticated: Boolean(currentUser),
      isAdmin: currentUser?.role === "admin",
      registerUser,
      loginUser,
      logout,
    }),
    [currentUser, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
