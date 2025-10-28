import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage, { STORAGE_KEYS } from '../utils/storage.js';
import { ROLES } from '../utils/roles.js';

const AuthContext = createContext();

// Mock a simple user database
export const MOCK_USERS = {
  'user_001': { id: 'user_001', name: 'Naledi P.', role: ROLES.PERSONAL, verified: false, town: 'Bothaville' },
  'biz_001': { id: 'biz_001', name: 'Naledi\'s Bakery', role: ROLES.BUSINESS, verified: true, ownerId: 'user_001', town: 'Bothaville' },
  'user_002': { id: 'user_002', name: 'Thabo', role: ROLES.PERSONAL, verified: false, town: 'Bothaville' },
  'user_003': { id: 'user_003', name: 'Sipho', role: ROLES.PERSONAL, verified: false, town: 'Bothaville' },
  'gov_001': { id: 'gov_001', name: 'Nala Council', role: ROLES.GOVERNMENT, verified: true, town: 'Bothaville' },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Start as logged out
  const [ownedPages, setOwnedPages] = useState([]);
  const [activeIdentityId, setActiveIdentityId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatars, setAvatars] = useState({});

  useEffect(() => {
    const loadUser = async () => {
      try {
        const u = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        if (u) {
          const parsed = JSON.parse(u);
          const loadedUser = parsed.user;
          if (loadedUser) {
            setUser(loadedUser);
            setOwnedPages(Object.values(MOCK_USERS).filter(p => p.ownerId === loadedUser.id));
            setActiveIdentityId(parsed.activeIdentityId || loadedUser.id);
          }
        }
      } catch(e) {
        console.warn("[Yaka] User load error", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ user, activeIdentityId })).catch(()=>{});
    }
  }, [user, activeIdentityId, isLoading]);

  const activeIdentity = MOCK_USERS[activeIdentityId] || user;
  const isLoggedIn = !!user && user.id !== 'guest_000';

  const login = (selectedUser) => {
    setUser(selectedUser);
    setActiveIdentityId(selectedUser.id);
    setOwnedPages(Object.values(MOCK_USERS).filter(p => p.ownerId === selectedUser.id));
  };
  
  const logout = () => {
    setUser(null);
    setActiveIdentityId(null);
    setOwnedPages([]);
  };

  const updateUserIdentity = (identityId, updates) => {
    const userToUpdate = MOCK_USERS[identityId];
    if (userToUpdate) {
        MOCK_USERS[identityId] = { ...userToUpdate, ...updates };
        // If the updated identity is the active one, we need to refresh the context state
        if (activeIdentityId === identityId) {
            setActiveIdentityId(null); // force a re-render
            setActiveIdentityId(identityId);
        }
    }
  };

  const value = {
    user, setUser,
    ownedPages,
    activeIdentity, setActiveIdentityId,
    username: activeIdentity?.name || 'Guest',
    allUsers: MOCK_USERS,
    isLoggedIn,
    login,
    logout,
    updateUserIdentity,
    avatars, setAvatars,
    isLoadingAuth: isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);