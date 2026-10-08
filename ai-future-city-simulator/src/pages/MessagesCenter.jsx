import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, MessageCircle, MessageSquare, Send, Trash2, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getLocalRegisteredUsers,
  USER_ACCOUNTS_UPDATED_EVENT,
} from "../utils/userHistory";
import {
  CHAT_STORAGE_KEY,
  CHAT_UPDATED_EVENT,
  deleteChatMessage,
  getChatMessages,
  markChatRoomAsRead,
  sendChatMessage,
} from "../utils/chatStore";

const formatMessageTime = (timestamp) => new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
}).format(new Date(timestamp));

export default function MessagesCenter() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.authType === "admin";
  const [messages, setMessages] = useState(getChatMessages);
  const [users, setUsers] = useState(getLocalRegisteredUsers);
  const [adminRoom, setAdminRoom] = useState("team");
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [draft, setDraft] = useState("");
  const [messageError, setMessageError] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const refreshMessages = () => setMessages(getChatMessages());
    const refreshUsers = () => setUsers(getLocalRegisteredUsers());
    const handleStorage = (event) => {
      if (!event.key || event.key === CHAT_STORAGE_KEY) refreshMessages();
      if (!event.key || event.key === "city_registered_users") refreshUsers();
    };

    window.addEventListener(CHAT_UPDATED_EVENT, refreshMessages);
    window.addEventListener(USER_ACCOUNTS_UPDATED_EVENT, refreshUsers);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(CHAT_UPDATED_EVENT, refreshMessages);
      window.removeEventListener(USER_ACCOUNTS_UPDATED_EVENT, refreshUsers);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const supportThreads = useMemo(() => {
    const threadMap = new Map(users.map((user) => [user.email, {
      email: user.email,
      name: user.name || user.email,
      avatar: user.avatar,
      loginCount: user.loginCount,
      messageCount: 0,
      lastMessageAt: user.createdAt || 0,
    }]));

    messages.filter((message) => message.room === "support").forEach((message) => {
      const thread = threadMap.get(message.threadId) || {
        email: message.threadId,
        name: message.senderRole === "user" ? message.senderName : message.threadId,
        avatar: message.senderName?.slice(0, 2).toUpperCase(),
        loginCount: 0,
        messageCount: 0,
        lastMessageAt: 0,
      };
      thread.messageCount += 1;
      thread.lastMessageAt = Math.max(thread.lastMessageAt, message.sentAt);
      if (message.senderRole === "user") thread.name = message.senderName || thread.name;
      threadMap.set(message.threadId, thread);
    });

    return [...threadMap.values()].sort((left, right) => right.lastMessageAt - left.lastMessageAt);
  }, [messages, users]);

  const activeThreadId = isAdmin
    ? adminRoom === "team" ? "admins" : selectedUserEmail
    : currentUser?.email?.toLowerCase() || "";
  const activeMessages = useMemo(() => {
    if (!activeThreadId) return [];
    const room = isAdmin && adminRoom === "team" ? "admin" : "support";
    return messages.filter((message) => message.room === room && message.threadId === activeThreadId);
  }, [messages, activeThreadId, isAdmin, adminRoom]);
  const selectedSupportUser = supportThreads.find((thread) => thread.email === selectedUserEmail);

  useEffect(() => {
    if (!activeThreadId || !currentUser?.email) return;
    markChatRoomAsRead({
      email: currentUser.email,
      role: isAdmin ? "admin" : "user",
      room: isAdmin && adminRoom === "team" ? "admin" : "support",
      threadId: activeThreadId,
    });
  }, [activeThreadId, currentUser?.email, isAdmin, adminRoom, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeMessages.length, activeThreadId]);

  const handleSend = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !currentUser?.email) return;

    const isTeamRoom = isAdmin && adminRoom === "team";
    const threadId = isTeamRoom ? "admins" : isAdmin ? selectedUserEmail : currentUser.email.toLowerCase();
    if (!threadId) return;

    const sent = sendChatMessage({
      room: isTeamRoom ? "admin" : "support",
      threadId,
      senderEmail: currentUser.email,
      senderName: currentUser.name || currentUser.email,
      senderRole: isAdmin ? "admin" : "user",
      text,
    });
    if (sent) {
      setDraft("");
      setMessageError("");
    } else {
      setMessageError("This message could not be saved in this browser.");
    }
  };

  const handleDelete = (message) => {
    const deleted = deleteChatMessage({
      messageId: message.id,
      actorEmail: currentUser?.email,
      actorRole: isAdmin ? "admin" : "user",
    });
    setMessageError(deleted ? "" : "This message could not be deleted.");
  };

  const roomTitle = isAdmin
    ? adminRoom === "team" ? "Admin team room" : selectedSupportUser ? `Support · ${selectedSupportUser.name}` : "User support inbox"
    : "Message the admin team";
  const canCompose = !isAdmin || adminRoom === "team" || Boolean(selectedUserEmail);

  return (
    <main className="messages-center-shell mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-slate-700/70 bg-[#0a1511] text-slate-100 shadow-2xl shadow-black/20">
      <header className="messages-center-header flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/70 bg-[#0e1d17] px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="messages-center-mark grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#70e2d0]/25 bg-[#70e2d0]/10 text-[#70e2d0]">
            {isAdmin ? <Users className="h-5 w-5" aria-hidden="true" /> : <MessageCircle className="h-5 w-5" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#70e2d0]">
              {isAdmin ? "ADMIN COMMUNICATIONS" : "USER SUPPORT"}
            </p>
            <h1 className="truncate text-base font-bold text-white">{isAdmin ? "Messages" : "Contact the admin team"}</h1>
          </div>
        </div>
        {isAdmin ? (
          <Link to="/admin-dashboard" className="messages-center-header-link inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-600 px-3 text-xs font-semibold text-slate-200 transition-colors hover:border-[#70e2d0]/50 hover:text-[#70e2d0]">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Activity monitor
          </Link>
        ) : (
          <span className="inline-flex items-center gap-2 text-[11px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-[#70e2d0]" />Browser-local chat</span>
        )}
      </header>

      <div className="messages-center-body flex min-h-0 flex-1 flex-col md:flex-row">
        {isAdmin && (
          <aside className="messages-center-sidebar w-full shrink-0 border-b border-slate-700/70 bg-[#0c1914] md:w-64 md:border-b-0 md:border-r">
            <div className="p-3">
              <button
                type="button"
                onClick={() => { setAdminRoom("team"); setSelectedUserEmail(""); }}
                aria-pressed={adminRoom === "team"}
                className={`messages-center-thread flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold transition-colors ${adminRoom === "team" ? "is-active bg-[#70e2d0]/10 text-[#a5f3e5]" : "text-slate-300 hover:bg-white/[0.04]"}`}
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                Admin team room
              </button>
              <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">User support</p>
              <div className="max-h-64 space-y-1 overflow-y-auto md:max-h-[calc(100vh-22rem)]">
                {supportThreads.length > 0 ? supportThreads.map((thread) => (
                  <button
                    type="button"
                    key={thread.email}
                    onClick={() => { setAdminRoom("support"); setSelectedUserEmail(thread.email); }}
                    aria-pressed={adminRoom === "support" && selectedUserEmail === thread.email}
                    className={`messages-center-thread flex min-h-12 w-full items-center gap-2.5 rounded-md px-3 text-left transition-colors ${adminRoom === "support" && selectedUserEmail === thread.email ? "is-active bg-[#70e2d0]/10" : "hover:bg-white/[0.04]"}`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-600 bg-white/[0.03] font-mono text-[10px] font-bold text-slate-300">{thread.avatar || "U"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-slate-200">{thread.name}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">{thread.messageCount} messages</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden="true" />
                  </button>
                )) : <p className="px-3 py-2 text-[11px] leading-relaxed text-slate-500">No user conversations yet.</p>}
              </div>
            </div>
          </aside>
        )}

        <section className="messages-center-conversation flex min-h-[520px] min-w-0 flex-1 flex-col" aria-label={roomTitle}>
          <div className="messages-center-conversation-header flex items-center justify-between gap-3 border-b border-slate-700/60 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <MessageSquare className="h-4 w-4 shrink-0 text-[#70e2d0]" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-slate-100">{roomTitle}</h2>
                <p className="mt-0.5 text-[10px] text-slate-500">{activeMessages.length} messages</p>
              </div>
            </div>
            {isAdmin && adminRoom === "team" && <span className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Admins only</span>}
          </div>

          <div className="messages-center-feed flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-5" aria-live="polite">
            {activeMessages.length > 0 ? activeMessages.map((message) => {
              const isOwnMessage = message.senderEmail === currentUser?.email?.toLowerCase();
              return (
                <article key={message.id} className={`messages-center-message group flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                  <div className={`messages-center-bubble max-w-[min(85%,38rem)] rounded-lg border px-3.5 py-2.5 ${isOwnMessage ? "is-own border-[#70e2d0]/20 bg-[#70e2d0]/[0.08]" : "is-incoming border-slate-700 bg-white/[0.025]"}`}>
                    <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className={`text-[11px] font-semibold ${message.senderRole === "admin" ? "text-[#70e2d0]" : "text-slate-200"}`}>{message.senderName}</span>
                      <time className="text-[10px] text-slate-500" dateTime={new Date(message.sentAt).toISOString()}>{formatMessageTime(message.sentAt)}</time>
                      {(isOwnMessage || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => handleDelete(message)}
                          aria-label={`Delete message from ${message.senderName}`}
                          title="Delete message"
                          className="messages-center-delete ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 transition-colors hover:bg-rose-400/10 hover:text-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">{message.text}</p>
                  </div>
                </article>
              );
            }) : (
              <div className="messages-center-empty m-auto max-w-sm px-5 py-12 text-center">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-lg border border-[#70e2d0]/20 bg-[#70e2d0]/[0.07] text-[#70e2d0]"><MessageCircle className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="mt-3 text-sm font-semibold text-white">{canCompose ? "Start the conversation" : "Choose a user conversation"}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{canCompose ? "Messages appear here for this room." : "Select a user from the support list to read and reply."}</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messageError && <p className="px-4 pb-2 text-xs text-rose-300" role="alert">{messageError}</p>}
          <form onSubmit={handleSend} className="messages-center-compose border-t border-slate-700/70 bg-[#0d1914] p-3 sm:p-4">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
                placeholder={canCompose ? (isAdmin && adminRoom === "team" ? "Message the admin team…" : "Write a message…") : "Select a user to reply"}
                aria-label="Write a chat message"
                maxLength={2000}
                rows={2}
                disabled={!canCompose}
                className="messages-center-input min-h-11 min-w-0 flex-1 resize-y rounded-md border border-slate-700 bg-black/20 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-[#70e2d0]/55 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!canCompose || !draft.trim()}
                className="messages-center-send inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-[#70e2d0] px-3.5 text-xs font-bold text-[#10201b] transition-colors hover:bg-[#a1f2e5] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Send
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Messages sync across tabs in this browser only. Cross-device chat requires a shared server.</p>
          </form>
        </section>
      </div>
    </main>
  );
}
