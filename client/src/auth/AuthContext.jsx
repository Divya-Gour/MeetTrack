// client/src/auth/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadDemoState, saveDemoState, resetDemoState } from '../data/demoStore';

const AuthContext = createContext();

const STORAGE_MODE_KEY = 'mt.mode';
const STORAGE_LIVE_USER_KEY = 'mt.live.user';
const STORAGE_LIVE_WS_KEY = 'mt.live.workspace';
const STORAGE_DEMO_USER_ID = 'mt.demo.userId';

export function AuthProvider({ children }) {
  // Mode: 'demo' | 'live' | null
  const [mode, setMode] = useState(() => {
    return localStorage.getItem(STORAGE_MODE_KEY) || null;
  });

  // Demo state
  const [demoState, setDemoState] = useState(() => loadDemoState());

  // Current User & Workspace
  const [currentUser, setCurrentUser] = useState(() => {
    const savedMode = localStorage.getItem(STORAGE_MODE_KEY);
    if (savedMode === 'demo') {
      const state = loadDemoState();
      const savedId = localStorage.getItem(STORAGE_DEMO_USER_ID);
      const user = state.users.find((u) => u.id === savedId) || state.users[1]; // Priya Nair by default
      return user;
    }
    if (savedMode === 'live') {
      try {
        const liveUser = localStorage.getItem(STORAGE_LIVE_USER_KEY);
        if (liveUser) return JSON.parse(liveUser);
      } catch (e) {}
    }
    return null;
  });

  const [currentWorkspace, setCurrentWorkspace] = useState(() => {
    const savedMode = localStorage.getItem(STORAGE_MODE_KEY);
    if (savedMode === 'demo') {
      return loadDemoState().workspace;
    }
    if (savedMode === 'live') {
      try {
        const liveWs = localStorage.getItem(STORAGE_LIVE_WS_KEY);
        if (liveWs) return JSON.parse(liveWs);
      } catch (e) {}
    }
    return null;
  });

  // Sync mode changes to localStorage
  useEffect(() => {
    if (mode) {
      localStorage.setItem(STORAGE_MODE_KEY, mode);
    } else {
      localStorage.removeItem(STORAGE_MODE_KEY);
      localStorage.removeItem(STORAGE_LIVE_USER_KEY);
      localStorage.removeItem(STORAGE_LIVE_WS_KEY);
      localStorage.removeItem(STORAGE_DEMO_USER_ID);
    }
  }, [mode]);

  // Demo Mode Handlers
  const enterDemoMode = useCallback((targetUserId = 'user-priya') => {
    const state = loadDemoState();
    const user = state.users.find((u) => u.id === targetUserId) || state.users[1];
    setMode('demo');
    setDemoState(state);
    setCurrentUser(user);
    setCurrentWorkspace(state.workspace);
    localStorage.setItem(STORAGE_MODE_KEY, 'demo');
    localStorage.setItem(STORAGE_DEMO_USER_ID, user.id);
  }, []);

  const switchDemoRole = useCallback((roleName) => {
    if (mode !== 'demo') return;
    const state = loadDemoState();
    const targetUser = state.users.find((u) => u.role === roleName) || state.users[0];
    setCurrentUser(targetUser);
    localStorage.setItem(STORAGE_DEMO_USER_ID, targetUser.id);
  }, [mode]);

  const switchDemoUser = useCallback((userId) => {
    if (mode !== 'demo') return;
    const state = loadDemoState();
    const user = state.users.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(STORAGE_DEMO_USER_ID, user.id);
    }
  }, [mode]);

  const handleResetDemoData = useCallback(() => {
    const pristine = resetDemoState();
    setDemoState(pristine);
    const user = pristine.users.find((u) => u.id === currentUser?.id) || pristine.users[1];
    setCurrentUser(user);
    setCurrentWorkspace(pristine.workspace);
    return pristine;
  }, [currentUser]);

  // Live Mode Handlers
  const enterLiveMode = useCallback((user, workspace) => {
    setMode('live');
    setCurrentUser(user);
    setCurrentWorkspace(workspace);
    localStorage.setItem(STORAGE_MODE_KEY, 'live');
    localStorage.setItem(STORAGE_LIVE_USER_KEY, JSON.stringify(user));
    localStorage.setItem(STORAGE_LIVE_WS_KEY, JSON.stringify(workspace));
  }, []);

  const logout = useCallback(() => {
    setMode(null);
    setCurrentUser(null);
    setCurrentWorkspace(null);
    localStorage.removeItem(STORAGE_MODE_KEY);
    localStorage.removeItem(STORAGE_LIVE_USER_KEY);
    localStorage.removeItem(STORAGE_LIVE_WS_KEY);
    localStorage.removeItem(STORAGE_DEMO_USER_ID);
  }, []);

  const isAuthenticated = Boolean(currentUser && mode);

  return (
    <AuthContext.Provider
      value={{
        mode,
        isDemo: mode === 'demo',
        isLive: mode === 'live',
        currentUser,
        currentWorkspace,
        isAuthenticated,
        enterDemoMode,
        switchDemoRole,
        switchDemoUser,
        resetDemoData: handleResetDemoData,
        enterLiveMode,
        logout,
        demoUsers: demoState.users,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
