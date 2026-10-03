import React, { createContext, useContext, useState } from "react";
import {
  clearUserHistory,
  notifyUserAccountsUpdated,
  recordUserAction,
} from "../utils/userHistory";
import { deleteChatDataForUser } from "../utils/chatStore";
import { deletePredictionReportsForUser } from "../utils/predictionReportArchive";

const AuthContext = createContext(null);
const REGISTERED_USERS_KEY = "city_registered_users";

const readRegisteredUsers = () => {
  try {
    const users = JSON.parse(localStorage.getItem(REGISTERED_USERS_KEY) || "[]");
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
};

const readSavedUser = () => {
  try {
    const saved = localStorage.getItem("city_auth_user");
    if (!saved) return null;

    const user = JSON.parse(saved);
    if (
      user?.authType === "user" &&
      !readRegisteredUsers().some((registeredUser) => registeredUser.email === user.email)
    ) {
      localStorage.removeItem("city_auth_user");
      return null;
    }

    return user;
  } catch {
    return null;
  }
};

// Hardcoded admin credentials
export const ADMINS = [
  { id: 1, name: "Aman Prajapati", email: "a@gmail.comm", altEmail: "a@gmail.com", password: "12345678", role: "Super Admin", avatar: "AP" },
  { id: 2, name: "Harsh Pal", email: "h@gmail.com", password: "12345678", role: "City Admin", avatar: "HP" },
  { id: 3, name: "Aniket Patel", email: "ani@gmail.com", password: "12345678", role: "Data Admin", avatar: "AP" },
  { id: 4, name: "Sumant Rai", email: "s@gmail.com", password: "12345678", role: "Ops Admin", avatar: "SR" },
];

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(readSavedUser);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!readSavedUser());

  const startSession = (user) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    try {
      localStorage.setItem("city_auth_user", JSON.stringify(user));
    } catch {
      // Keep the session active for this tab if browser storage is unavailable.
    }
  };

  const loginAdmin = (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const admin = ADMINS.find(
      (a) =>
        (a.email.toLowerCase() === cleanEmail ||
         (a.altEmail && a.altEmail.toLowerCase() === cleanEmail)) &&
        a.password === password.trim()
    );
    if (admin) {
      const userObj = {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar,
        authType: "admin",
      };
      startSession(userObj);
      return { success: true };
    }
    return { success: false, message: "Invalid admin credentials. Only authorized admins can login." };
  };

  const loginUser = (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const registeredUser = readRegisteredUsers().find((user) => user.email === cleanEmail);

    if (!registeredUser) {
      return { success: false, message: "No account found for this email. Register first to continue." };
    }
    if (registeredUser.password !== password) {
      return { success: false, message: "Incorrect email or password." };
    }

    const lastLoginAt = Date.now();
    const loginCount = (Number(registeredUser.loginCount) || 0) + 1;
    try {
      const updatedUsers = readRegisteredUsers().map((user) => user.email === cleanEmail
        ? { ...user, loginCount, lastLoginAt }
        : user);
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updatedUsers));
      notifyUserAccountsUpdated();
    } catch {
      // Keep login available if browser storage is unavailable.
    }

    const userProfile = {
      id: registeredUser.id,
      name: registeredUser.name,
      email: registeredUser.email,
      role: registeredUser.role,
      authType: registeredUser.authType,
      avatar: registeredUser.avatar,
      loginCount,
      lastLoginAt,
    };
    recordUserAction(userProfile, "/login", null, "Signed in");
    startSession(userProfile);
    return { success: true };
  };

  const registerUser = (name, email, phone, password) => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = String(phone || "").trim();
    const phoneDigits = cleanPhone.replace(/\D/g, "");

    if (!cleanName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || phoneDigits.length < 7 || phoneDigits.length > 15) {
      return { success: false, message: "Enter your name, a valid email address, and a valid phone number." };
    }
    if (password.length < 8) {
      return { success: false, message: "Password must be at least 8 characters." };
    }

    const registeredUsers = readRegisteredUsers();
    if (registeredUsers.some((user) => user.email === cleanEmail)) {
      return { success: false, message: "An account with this email already exists. Please log in." };
    }

    const userProfile = {
      id: Date.now(),
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      role: "Verified Citizen / User",
      authType: "user",
      avatar: cleanName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      loginCount: 0,
      lastLoginAt: null,
      createdAt: Date.now(),
    };

    try {
      localStorage.setItem(
        REGISTERED_USERS_KEY,
        JSON.stringify([...registeredUsers, { ...userProfile, password }])
      );
      notifyUserAccountsUpdated();
    } catch {
      return { success: false, message: "Could not save your account in this browser. Check browser storage and try again." };
    }

    recordUserAction(userProfile, "/register", null, "Created account");
    return { success: true };
  };

  const resetUserPassword = (email, phone, password) => {
    const cleanEmail = String(email || "").trim().toLowerCase();
    const phoneDigits = String(phone || "").replace(/\D/g, "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || phoneDigits.length < 7 || phoneDigits.length > 15) {
      return { success: false, message: "Enter a valid account email and phone number." };
    }
    if (String(password || "").length < 8) {
      return { success: false, message: "Your new password must be at least 8 characters." };
    }

    const users = readRegisteredUsers();
    const matchingUser = users.find((user) => (
      user.email === cleanEmail && String(user.phone || "").replace(/\D/g, "") === phoneDigits
    ));
    if (!matchingUser) {
      return { success: false, message: "The email and phone number do not match a registered user account." };
    }

    try {
      const updatedUsers = users.map((user) => user.email === cleanEmail
        ? { ...user, password }
        : user);
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updatedUsers));
      notifyUserAccountsUpdated();
      return { success: true };
    } catch {
      return { success: false, message: "Could not update your password in this browser. Check browser storage and try again." };
    }
  };

  const removeRegisteredUser = (email) => {
    const cleanEmail = email.trim().toLowerCase();
    const users = readRegisteredUsers();
    const updatedUsers = users.filter((user) => user.email !== cleanEmail);
    if (updatedUsers.length === users.length) return false;

    try {
      if (!clearUserHistory({ email: cleanEmail })) return false;
      if (!deleteChatDataForUser(cleanEmail)) return false;
      if (!deletePredictionReportsForUser(cleanEmail)) return false;
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updatedUsers));
      notifyUserAccountsUpdated();
      return true;
    } catch {
      return false;
    }
  };

  const deleteUserAccount = (email) => {
    if (currentUser?.authType !== "admin") return false;
    return removeRegisteredUser(email);
  };

  const deleteCurrentUserAccount = () => {
    if (currentUser?.authType !== "user" || !currentUser.email) {
      return { success: false, message: "Only a signed-in user can delete their own account." };
    }
    if (!removeRegisteredUser(currentUser.email)) {
      return { success: false, message: "The account could not be fully deleted from this browser. Please try again." };
    }

    try {
      localStorage.removeItem("city_auth_user");
    } catch {
      // readSavedUser removes this stale session when the deleted account is checked on reload.
    }
    setCurrentUser(null);
    setIsLoggedIn(false);
    return { success: true };
  };

  const logout = () => {
    if (currentUser?.authType === "user") {
      recordUserAction(currentUser, window.location.pathname, null, "Signed out");
    }
    setCurrentUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem("city_auth_user");
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoggedIn, loginAdmin, loginUser, registerUser, resetUserPassword, deleteUserAccount, deleteCurrentUserAccount, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
