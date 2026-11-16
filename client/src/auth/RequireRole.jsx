// src/auth/RequireRole.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Forbidden403 from '../pages/Forbidden403';

export default function RequireRole({ allowedRoles = [], children }) {
  const { currentUser, isAuthenticated } = useAuth();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    // Show 403 error page directly per spec — do not redirect silently!
    return <Forbidden403 requiredRoles={allowedRoles} userRole={currentUser.role} />;
  }

  return children;
}

