import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { KEYS, readJSON, writeJSON } from "./storage.js";

// A pseudonymous username (no real name needed) used as user_id for chat, saved schemes and profile.
const UserContext = createContext(null);

export const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/;

export function UserProvider({ children }) {
  const [userId, setUserIdState] = useState(() => readJSON("local", KEYS.userId, null));
  const [user, setUser] = useState(null); // GET /api/users/{id} response
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setUser(null);
      return null;
    }
    setLoading(true);
    try {
      const data = await api.user(userId);
      setUser(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setUserId = useCallback((id) => {
    const clean = id ? id.trim() : null;
    writeJSON("local", KEYS.userId, clean);
    setUser(null);
    setUserIdState(clean);
  }, []);

  const setConsent = useCallback(
    async (consent) => {
      if (!userId) return;
      const data = await api.setConsent(userId, consent);
      setUser(data);
    },
    [userId]
  );

  const saveProfile = useCallback(
    async (profile) => {
      if (!userId) return;
      const data = await api.saveProfile(userId, profile);
      setUser(data);
    },
    [userId]
  );

  const deleteData = useCallback(async () => {
    if (!userId) return;
    await api.deleteUser(userId);
    // Sign out afterwards: fetching the user again would re-create an empty record.
    writeJSON("local", KEYS.userId, null);
    writeJSON("session", KEYS.chat, null);
    setUser(null);
    setUserIdState(null);
  }, [userId]);

  const savedIds = useMemo(() => new Set((user?.saved || []).map((s) => s.scheme_id)), [user]);

  const toggleSaved = useCallback(
    async (schemeId) => {
      if (!userId) throw new Error("Choose a username first (sidebar) to save schemes.");
      const data = savedIds.has(schemeId)
        ? await api.unsaveScheme(userId, schemeId)
        : await api.saveScheme(userId, schemeId);
      setUser(data);
    },
    [userId, savedIds]
  );

  const value = useMemo(
    () => ({
      userId, user, loading, error, refresh, setUserId, setConsent, saveProfile, deleteData,
      savedIds, toggleSaved, consent: Boolean(user?.consent_to_store),
    }),
    [userId, user, loading, error, refresh, setUserId, setConsent, saveProfile, deleteData, savedIds, toggleSaved]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}
