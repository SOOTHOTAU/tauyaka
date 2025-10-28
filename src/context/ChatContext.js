// src/context/ChatContext.js
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useData } from './DataContext.js';

let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  const mem = {};
  AsyncStorage = {
    async getItem(k){ return mem[k] ?? null; },
    async setItem(k,v){ mem[k] = v; },
    async removeItem(k){ delete mem[k]; },
  };
}

const THREADS_KEY = 'yaka_threads_v1';
const MSGS_PREFIX = 'yaka_thread_msgs_';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  // Use DataContext if available; keep a local mirror so Messages tab badge stays live.
  const dataCtx = useData() || {};
  const { messages = {}, setMessages, posts = [] } = dataCtx;

  const [threads, setThreads] = useState(() => (Array.isArray(messages?.threads) ? messages.threads : []));

  // Keep local threads in sync with DataContext
  useEffect(() => {
    if (Array.isArray(messages?.threads)) setThreads(messages.threads);
  }, [messages?.threads]);

  // Initial load from storage if DataContext is empty
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (Array.isArray(messages?.threads) && messages.threads.length) return;
      const raw = await AsyncStorage.getItem(THREADS_KEY);
      if (!mounted) return;
      const fromStore = raw ? safeArray(JSON.parse(raw)) : [];
      if (fromStore.length) {
        setThreads(fromStore);
        if (typeof setMessages === 'function') {
          setMessages((prev) => ({ ...(prev || {}), threads: fromStore }));
        }
      }
    })();
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const persistThreads = useCallback(async (next) => {
    const safe = safeArray(next);
    setThreads(safe);
    if (typeof setMessages === 'function') {
      setMessages((prev) => ({ ...(prev || {}), threads: safe }));
    }
    await AsyncStorage.setItem(THREADS_KEY, JSON.stringify(safe));
  }, [setMessages]);

  // --- Helpers --------------------------------------------------------------

  const slugify = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const userKeyAndName = (idOrName) => {
    // Accept userId OR userName; return a deterministic key and display name.
    if (!idOrName) return { key: 'user', name: 'User' };
    const str = String(idOrName).trim();
    return { key: slugify(str) || 'user', name: str };
  };

  const threadIdForUser = (idOrName) => {
    const { key } = userKeyAndName(idOrName);
    return `u-${key}`;
  };

  // --- API: openThreadWith --------------------------------------------------
  // Ensures a single thread per user; creates if missing; returns threadId
  const openThreadWith = useCallback(async (idOrName) => {
    const { name } = userKeyAndName(idOrName);
    const id = threadIdForUser(idOrName);
    const now = Date.now();

    // Upsert preview
    const list = safeArray(Array.isArray(messages?.threads) ? messages.threads : threads);
    const idx = list.findIndex(t => t.id === id);

    let next;
    if (idx >= 0) {
      // Keep title fresh; do not overwrite lastText unless empty
      const t = list[idx];
      next = list.map((x, i) =>
        i === idx ? { ...t, title: name || t.title, lastText: t.lastText || '', lastTs: t.lastTs || now, unread: 0 } : x
      );
    } else {
      next = [{ id, title: name || 'Chat', participants: ['you', name || 'User'], lastText: '', lastTs: now, unread: 0 }, ...list];
    }

    await persistThreads(next);

    // Ensure a messages array exists (even empty), so ChatThread renders immediately
    const msgKey = MSGS_PREFIX + id;
    const existing = await AsyncStorage.getItem(msgKey);
    if (!existing) {
      await AsyncStorage.setItem(msgKey, JSON.stringify([]));
    }

    return id;
  }, [messages?.threads, threads, persistThreads]);

  // --- API: getUserPosts ----------------------------------------------------
  const getUserPosts = useCallback((idOrName) => {
    const { key, name } = userKeyAndName(idOrName);
    const candidates = Array.isArray(posts) ? posts : [];

    return candidates.filter((p) => {
      const authorId =
        p?.authorId ?? p?.userId ?? p?.author?.id ?? p?.ownerId ?? p?.sellerId ?? null;
      const authorName =
        p?.authorName ?? p?.userName ?? p?.author?.name ?? p?.sellerName ?? p?.by ?? null;

      return (
        (authorId && slugify(String(authorId)) === key) ||
        (authorName && String(authorName).trim().toLowerCase() === name.toLowerCase())
      );
    });
  }, [posts]);

  const value = useMemo(() => ({
    openThreadWith,
    getUserPosts,
    threadIdForUser,
  }), [openThreadWith, getUserPosts]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext) || {};
}

// --- utils -----------------------------------------------------------------
function safeArray(v){ return Array.isArray(v) ? v : []; }
