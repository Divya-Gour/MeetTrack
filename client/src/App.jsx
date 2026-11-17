import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './app/theme';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';
import RequireRole from './auth/RequireRole';
import Shell from './components/Shell';
import AssistantButton from './assistant/AssistantButton';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import SetupWizardPage from './pages/SetupWizardPage';
import JoinInvitePage from './pages/JoinInvitePage';
import DashboardPage from './pages/DashboardPage';
import MeetingsPage from './pages/MeetingsPage';
import CalendarPage from './pages/CalendarPage';
import MeetingDetailsPage from './pages/MeetingDetailsPage';
import MinutesEditorPage from './pages/MinutesEditorPage';
import ApprovalsPage from './pages/ApprovalsPage';
import ActionsPage from './pages/ActionsPage';
import DecisionsPage from './pages/DecisionsPage';
import ReportsPage from './pages/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import Forbidden403 from './pages/Forbidden403';
import NotFound404 from './pages/NotFound404';

function ShellWrapper({ children }) {
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
            {/* Global Floating AI Assistant Button */}
            <AssistantButton />

            <Routes>
              {/* Public Entry Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/setup" element={<SetupWizardPage />} />
              <Route path="/join/:token" element={<JoinInvitePage />} />

              {/* Protected App Routes (inside Shell) */}
              <Route
                path="/dashboard"
                element={
                  <ShellWrapper>
                    <DashboardPage />
                  </ShellWrapper>
                }
              />
              <Route
                path="/meetings"
                element={
                  <ShellWrapper>
                    <MeetingsPage />
                  </ShellWrapper>
                }
              />
              <Route
                path="/meetings/:id"
                element={
                  <ShellWrapper>
                    <MeetingDetailsPage />
                  </ShellWrapper>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ShellWrapper>
                    <CalendarPage />
                  </ShellWrapper>
                }
              />
              <Route
                path="/minutes/:id"
                element={
                  <ShellWrapper>
                    <MinutesEditorPage />
                  </ShellWrapper>
                }
              />
              <Route
                path="/approvals"
                element={
                  <ShellWrapper>
                    <ApprovalsPage />
                  </ShellWrapper>
                }
              />
              <Route
                path="/actions"
                element={
                  <ShellWrapper>
                    <ActionsPage />
                  </ShellWrapper>
                }
              />
              <Route
                path="/decisions"
                element={
                  <ShellWrapper>
                    <DecisionsPage />
                  </ShellWrapper>
                }
              />
              <Route
                path="/reports"
                element={
                  <ShellWrapper>
                    <RequireRole allowedRoles={['Admin', 'Coordinator']}>
                      <ReportsPage />
                    </RequireRole>
                  </ShellWrapper>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ShellWrapper>
                    <NotificationsPage />
                  </ShellWrapper>
                }
              />
              <Route
                path="/admin"
                element={
                  <ShellWrapper>
                    <RequireRole allowedRoles={['Admin']}>
                      <AdminPage />
                    </RequireRole>
                  </ShellWrapper>
                }
              />
              <Route
                path="/profile"
                element={
                  <ShellWrapper>
                    <ProfilePage />
                  </ShellWrapper>
                }
              />

              {/* Explicit 403 test route */}
              <Route
                path="/forbidden"
                element={
                  <ShellWrapper>
                    <Forbidden403 />
                  </ShellWrapper>
                }
              />

              {/* Catch-all 404 Route */}
              <Route path="*" element={<NotFound404 />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
