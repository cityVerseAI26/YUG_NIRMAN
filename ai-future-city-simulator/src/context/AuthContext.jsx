import React, { createContext, useContext } from "react";

const AuthContext = createContext(null);
const unavailable = { success: false, message: "Accounts are disabled in the public demo." };

export const AuthProvider = ({ children }) => {
  const value = {
    currentUser: null,
    isLoggedIn: false,
    loginAdmin: () => unavailable,
    loginUser: () => unavailable,
    registerUser: () => unavailable,
    resetUserPassword: () => unavailable,
    deleteUserAccount: () => false,
    deleteCurrentUserAccount: () => unavailable,
    logout: () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
