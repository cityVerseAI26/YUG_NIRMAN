import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;
const REFRESH_TOKEN_KEY = "yug-nirman.firebase-refresh-token";

function getFirebaseError(payload) {
  const code = payload?.error?.message || "";
  const messages = { EMAIL_EXISTS: "An account with this email already exists. Sign in instead.", INVALID_LOGIN_CREDENTIALS: "The email or password is incorrect.", EMAIL_NOT_FOUND: "No account was found for this email.", INVALID_PASSWORD: "The email or password is incorrect.", WEAK_PASSWORD: "Choose a password with at least 6 characters.", OPERATION_NOT_ALLOWED: "Email and password sign-in is not enabled in Firebase.", TOO_MANY_ATTEMPTS_TRY_LATER: "Too many attempts. Wait a while and try again.", API_KEY_INVALID: "Firebase is not configured with a valid web API key.", PROJECT_NOT_FOUND: "The configured Firebase project could not be found." };
  if (code === "INVALID_EMAIL") return "Enter a valid email address.";
  return messages[code] || (payload?.error?.message ? `Firebase sign-in failed: ${payload.error.message}` : "Firebase sign-in failed. Try again.");
}

async function firebaseRequest(endpoint, body) {
  if (!API_KEY) throw new Error("Firebase sign-in is not configured yet. Add VITE_FIREBASE_API_KEY in Netlify and redeploy.");
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${encodeURIComponent(API_KEY)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) throw new Error(getFirebaseError(payload));
  return payload;
}

async function refreshFirebaseSession(refreshToken) {
  if (!API_KEY) throw new Error("Firebase sign-in is not configured.");
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(API_KEY)}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(getFirebaseError(payload));
  return { idToken: payload.id_token, refreshToken: payload.refresh_token, expiresIn: payload.expires_in, localId: payload.user_id };
}

function getClaims(idToken) {
  try { const encoded = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(encoded)); }
  catch { throw new Error("Firebase returned an invalid sign-in token."); }
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const acceptTokens = (tokens) => {
    const claims = getClaims(tokens.idToken);
    const isAdmin = claims.admin === true || claims.role === "admin";
    const user = { id: tokens.localId || claims.user_id, name: claims.name || claims.email || "YUG NIRMAN user", email: claims.email || "", role: isAdmin ? (claims.role || "Admin") : "User", authType: isAdmin ? "admin" : "user", avatar: (claims.name || claims.email || "YN").split(/[\s@]+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() };
    try { window.sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken); }
    catch { throw new Error("This browser cannot keep the sign-in session. Enable session storage and try again."); }
    setCurrentUser(user);
    setSession({ refreshToken: tokens.refreshToken, expiresAt: Date.now() + Number(tokens.expiresIn || 3600) * 1000 });
    return user;
  };

  const clearSession = () => { window.sessionStorage.removeItem(REFRESH_TOKEN_KEY); setCurrentUser(null); setSession(null); };

  useEffect(() => {
    const refreshToken = window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) { setAuthLoading(false); return undefined; }
    refreshFirebaseSession(refreshToken).then(acceptTokens).catch((error) => { console.error("Could not restore Firebase session", error); clearSession(); }).finally(() => setAuthLoading(false));
    return undefined;
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    const timer = window.setTimeout(() => { refreshFirebaseSession(session.refreshToken).then(acceptTokens).catch((error) => { console.error("Firebase session refresh failed", error); clearSession(); }); }, Math.max(1000, session.expiresAt - Date.now() - 60_000));
    return () => window.clearTimeout(timer);
  }, [session]);

  const signIn = async (email, password, adminOnly = false) => {
    try {
      const tokens = await firebaseRequest("accounts:signInWithPassword", { email: String(email || "").trim(), password: String(password || ""), returnSecureToken: true });
      const claims = getClaims(tokens.idToken);
      if (adminOnly && claims.admin !== true && claims.role !== "admin") return { success: false, message: "This account is not authorized for the admin portal." };
      return { success: true, user: acceptTokens(tokens) };
    } catch (error) { return { success: false, message: error.message || "Could not sign in." }; }
  };

  const loginUser = (email, password) => signIn(email, password);
  const loginAdmin = (email, password) => signIn(email, password, true);
  const registerUser = async (name, email, phone, password) => {
    try {
      const tokens = await firebaseRequest("accounts:signUp", { email: String(email || "").trim(), password: String(password || ""), returnSecureToken: true });
      await firebaseRequest("accounts:update", { idToken: tokens.idToken, displayName: String(name || "").trim(), returnSecureToken: false });
      return { success: true };
    } catch (error) { return { success: false, message: error.message || "Could not create the account." }; }
  };
  const resetUserPassword = async (email) => {
    try { await firebaseRequest("accounts:sendOobCode", { requestType: "PASSWORD_RESET", email: String(email || "").trim() }); return { success: true }; }
    catch (error) { return { success: false, message: error.message || "Could not send a password reset email." }; }
  };

  const value = { currentUser, isLoggedIn: Boolean(currentUser), authLoading, loginAdmin, loginUser, registerUser, resetUserPassword, deleteUserAccount: () => false, deleteCurrentUserAccount: async () => ({ success: false, message: "Account deletion must be completed in Firebase." }), logout: clearSession };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth must be used within AuthProvider"); return ctx; };
