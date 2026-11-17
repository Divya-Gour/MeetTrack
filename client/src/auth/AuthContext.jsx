// client/src/auth/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadDemoState, saveDemoState, resetDemoState } from '../data/demoStore';
import { getCurrentUser, logout as apiLogout } from '../services/api';

const AuthContext = createContext();

const STORAGE_MODE_KEY = 'mt.mode';
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
    return null;
  });

  const [currentWorkspace, setCurrentWorkspace] = useState(() => {
    const savedMode = localStorage.getItem(STORAGE_MODE_KEY);
    if (savedMode === 'demo') {
      return loadDemoState().workspace;
    }
    return null;
  });

  const [isLoadingAuth, setIsLoadingAuth] = useState(mode === 'live');

  // Restore live session on mount or when mode is set to 'live' per Section 5
  useEffect(() => {
    if (mode === 'live') {
      setIsLoadingAuth(true);
      getCurrentUser()
        .then((data) => {
          if (data && data.user) {
            const userWithRole = {
              ...data.user,
              id: data.user._id || data.user.id,
              role: data.membership?.role ? (data.membership.role.charAt(0).toUpperCase() + data.membership.role.slice(1)) : 'Participant',
              isApprover: Boolean(data.membership?.approver),
              initials: data.user.name ? data.user.name.split(' ').map((n) => n[0]).join('') : 'U',
            };
            setCurrentUser(userWithRole);
            setCurrentWorkspace(data.workspace);
          } else {
            setCurrentUser(null);
            setCurrentWorkspace(null);
            setMode(null);
            localStorage.removeItem(STORAGE_MODE_KEY);
          }
        })
        .catch(() => {
          setCurrentUser(null);
          setCurrentWorkspace(null);
          setMode(null);
          localStorage.removeItem(STORAGE_MODE_KEY);
        })
        .finally(() => {
          setIsLoadingAuth(false);
        });
    } else {
      setIsLoadingAuth(false);
    }
  }, [mode]);

  // Sync mode changes to localStorage
  useEffect(() => {
    if (mode) {
      localStorage.setItem(STORAGE_MODE_KEY, mode);
    } else {
      localStorage.removeItem(STORAGE_MODE_KEY);
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
    const targetUser = state.users.find((u) => u.role.toLowerCase() === roleName.toLowerCase()) || state.users[0];
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
  const enterLiveMode = useCallback((user, workspace, membership = {}) => {
    setMode('live');
    const userWithRole = {
      ...user,
      id: user._id || user.id,
      role: membership?.role ? (membership.role.charAt(0).toUpperCase() + membership.role.slice(1)) : (user.role || 'Admin'),
      isApprover: Boolean(membership?.approver || user.isApprover),
      initials: user.name ? user.name.split(' ').map((n) => n[0]).join('') : 'U',
    };
    setCurrentUser(userWithRole);
    setCurrentWorkspace(workspace);
    localStorage.setItem(STORAGE_MODE_KEY, 'live');
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setMode(null);
    setCurrentUser(null);
    setCurrentWorkspace(null);
    localStorage.removeItem(STORAGE_MODE_KEY);
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
        isLoadingAuth,
        enterDemoMode,
        switchDemoRole,
        switchDemoUser,
        resetDemoData: handleResetDemoData,
        enterLiveMode,
        logout,
        demoUsers: demoState.users,
        allUsers: demoState.users,
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
