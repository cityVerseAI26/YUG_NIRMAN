import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  CHAT_READ_STATE_KEY,
  CHAT_READ_UPDATED_EVENT,
  CHAT_STORAGE_KEY,
  CHAT_UPDATED_EVENT,
  getUnreadChatCount,
} from "../utils/chatStore";

export default function useUnreadChatCount() {
  const { currentUser } = useAuth();
  const email = currentUser?.email?.trim().toLowerCase() || "";
  const role = currentUser?.authType === "admin" ? "admin" : "user";
  const [unreadCount, setUnreadCount] = useState(() => getUnreadChatCount({ email, role }));

  useEffect(() => {
    const refreshUnreadCount = () => setUnreadCount(getUnreadChatCount({ email, role }));
    const handleStorage = (event) => {
      if (!event.key || event.key === CHAT_STORAGE_KEY || event.key === CHAT_READ_STATE_KEY) {
        refreshUnreadCount();
      }
    };

    window.addEventListener(CHAT_UPDATED_EVENT, refreshUnreadCount);
    window.addEventListener(CHAT_READ_UPDATED_EVENT, refreshUnreadCount);
    window.addEventListener("storage", handleStorage);
    refreshUnreadCount();
    return () => {
      window.removeEventListener(CHAT_UPDATED_EVENT, refreshUnreadCount);
      window.removeEventListener(CHAT_READ_UPDATED_EVENT, refreshUnreadCount);
      window.removeEventListener("storage", handleStorage);
    };
  }, [email, role]);

  return unreadCount;
}
