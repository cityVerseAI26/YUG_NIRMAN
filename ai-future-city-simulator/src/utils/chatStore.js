export const CHAT_STORAGE_KEY = "yug-nirman-chat-messages";
export const CHAT_UPDATED_EVENT = "yug-nirman-chat-updated";
export const CHAT_READ_STATE_KEY = "yug-nirman-chat-read-state";
export const CHAT_READ_UPDATED_EVENT = "yug-nirman-chat-read-updated";
const MESSAGE_LIMIT = 500;

const getChatReadState = () => {
  try {
    const state = JSON.parse(window.localStorage.getItem(CHAT_READ_STATE_KEY) || "{}");
    return state && typeof state === "object" && !Array.isArray(state) ? state : {};
  } catch {
    return {};
  }
};

const getReadStateKey = (email, role) => `${role}:${email}`;

const isIncomingMessage = (message, email, role) => {
  if (role === "admin") {
    return message.room === "support"
      ? message.senderRole === "user"
      : message.room === "admin" && message.threadId === "admins" && message.senderEmail !== email;
  }

  return message.room === "support"
    && message.threadId === email
    && message.senderRole === "admin";
};

export const getUnreadChatCount = ({ email, role }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !["user", "admin"].includes(role)) return 0;

  const readIds = new Set(getChatReadState()[getReadStateKey(normalizedEmail, role)] || []);
  return getChatMessages().filter((message) => (
    isIncomingMessage(message, normalizedEmail, role) && !readIds.has(message.id)
  )).length;
};

export const markChatRoomAsRead = ({ email, role, room, threadId }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedThreadId = String(threadId || "").trim().toLowerCase();
  if (!normalizedEmail || !normalizedThreadId || !["user", "admin"].includes(role)) return false;
  if (role === "user" && (room !== "support" || normalizedThreadId !== normalizedEmail)) return false;
  if (role === "admin" && !["support", "admin"].includes(room)) return false;

  try {
    const messages = getChatMessages();
    const readState = getChatReadState();
    const key = getReadStateKey(normalizedEmail, role);
    const readIds = new Set(readState[key] || []);
    messages.forEach((message) => {
      if (
        message.room === room
        && message.threadId === normalizedThreadId
        && isIncomingMessage(message, normalizedEmail, role)
      ) {
        readIds.add(message.id);
      }
    });

    readState[key] = [...readIds].slice(-MESSAGE_LIMIT);
    window.localStorage.setItem(CHAT_READ_STATE_KEY, JSON.stringify(readState));
    window.dispatchEvent(new CustomEvent(CHAT_READ_UPDATED_EVENT, {
      detail: { email: normalizedEmail, role, room, threadId: normalizedThreadId },
    }));
    return true;
  } catch {
    return false;
  }
};

export const getChatMessages = () => {
  try {
    const messages = JSON.parse(window.localStorage.getItem(CHAT_STORAGE_KEY) || "[]");
    return Array.isArray(messages) ? messages : [];
  } catch {
    return [];
  }
};

export const sendChatMessage = (message) => {
  const text = String(message?.text || "").trim().slice(0, 2000);
  if (!text || !message?.senderEmail || !message?.threadId) return false;

  const nextMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    room: message.room === "admin" ? "admin" : "support",
    threadId: String(message.threadId),
    senderEmail: String(message.senderEmail).trim().toLowerCase(),
    senderName: String(message.senderName || "User").trim().slice(0, 80),
    senderRole: message.senderRole === "admin" ? "admin" : "user",
    text,
    sentAt: Date.now(),
  };

  try {
    const messages = [...getChatMessages(), nextMessage].slice(-MESSAGE_LIMIT);
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    window.dispatchEvent(new CustomEvent(CHAT_UPDATED_EVENT, { detail: nextMessage }));
    return true;
  } catch {
    return false;
  }
};

export const deleteChatMessage = ({ messageId, actorEmail, actorRole }) => {
  const normalizedEmail = String(actorEmail || "").trim().toLowerCase();
  if (!messageId || !normalizedEmail) return false;

  try {
    const messages = getChatMessages();
    const target = messages.find((message) => message.id === messageId);
    if (!target) return false;
    if (actorRole !== "admin" && target.senderEmail !== normalizedEmail) return false;

    const remainingMessages = messages.filter((message) => message.id !== messageId);
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(remainingMessages));
    window.dispatchEvent(new CustomEvent(CHAT_UPDATED_EVENT, {
      detail: { type: "delete", messageId },
    }));
    return true;
  } catch {
    return false;
  }
};

export const deleteChatDataForUser = (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return false;

  try {
    const messages = getChatMessages();
    const deletedIds = new Set(messages
      .filter((message) => message.senderEmail === normalizedEmail
        || (message.room === "support" && message.threadId.toLowerCase() === normalizedEmail))
      .map((message) => message.id));
    const remainingMessages = messages.filter((message) => !deletedIds.has(message.id));
    const readState = getChatReadState();

    Object.keys(readState).forEach((key) => {
      readState[key] = (readState[key] || []).filter((id) => !deletedIds.has(id));
    });

    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(remainingMessages));
    window.localStorage.setItem(CHAT_READ_STATE_KEY, JSON.stringify(readState));
    window.dispatchEvent(new CustomEvent(CHAT_UPDATED_EVENT, {
      detail: { type: "delete-user", email: normalizedEmail },
    }));
    window.dispatchEvent(new CustomEvent(CHAT_READ_UPDATED_EVENT, {
      detail: { type: "delete-user", email: normalizedEmail },
    }));
    return true;
  } catch {
    return false;
  }
};
