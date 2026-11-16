import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './app/theme';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';
import RequireRole from './auth/RequireRole';
import Shell from './components/Shell';
import AssistantButton from './assistant/AssistantButton';

// Screens
import Screen01Landing from './pages/Screen01Landing';
import Screen02Auth from './pages/Screen02Auth';
import ScreenSetupWizard from './pages/ScreenSetupWizard';
import ScreenJoinInvite from './pages/ScreenJoinInvite';
import Screen03Dashboard from './pages/Screen03Dashboard';
import Screen04Meetings from './pages/Screen04Meetings';
import Screen05Calendar from './pages/Screen05Calendar';
import Screen06MeetingDetails from './pages/Screen06MeetingDetails';
import Screen07MinutesEditor from './pages/Screen07MinutesEditor';
import Screen08Approvals from './pages/Screen08Approvals';
import Screen09Actions from './pages/Screen09Actions';
import Screen10Decisions from './pages/Screen10Decisions';
import Screen11Reports from './pages/Screen11Reports';
import Screen12Notifications from './pages/Screen12Notifications';
import Screen13Admin from './pages/Screen13Admin';
import Screen14Profile from './pages/Screen14Profile';
import Forbidden403 from './pages/Forbidden403';
import NotFound404 from './pages/NotFound404';

function ShellWrapper({ children }) {
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            {/* Global Floating AI Assistant Button */}
            <AssistantButton />

            <Routes>
              {/* Public Entry Routes */}
              <Route path="/" element={<Screen01Landing />} />
              <Route path="/login" element={<Screen02Auth />} />
              <Route path="/setup" element={<ScreenSetupWizard />} />
              <Route path="/join/:token" element={<ScreenJoinInvite />} />

              {/* Protected App Routes (inside Shell) */}
              <Route
                path="/dashboard"
                element={
                  <ShellWrapper>
                    <Screen03Dashboard />
                  </ShellWrapper>
                }
              />
              <Route
                path="/meetings"
                element={
                  <ShellWrapper>
                    <Screen04Meetings />
                  </ShellWrapper>
                }
              />
              <Route
                path="/meetings/:id"
                element={
                  <ShellWrapper>
                    <Screen06MeetingDetails />
                  </ShellWrapper>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ShellWrapper>
                    <Screen05Calendar />
                  </ShellWrapper>
                }
              />
              <Route
                path="/minutes/:id"
                element={
                  <ShellWrapper>
                    <Screen07MinutesEditor />
                  </ShellWrapper>
                }
              />
              <Route
                path="/approvals"
                element={
                  <ShellWrapper>
                    <Screen08Approvals />
                  </ShellWrapper>
                }
              />
              <Route
                path="/actions"
                element={
                  <ShellWrapper>
                    <Screen09Actions />
                  </ShellWrapper>
                }
              />
              <Route
                path="/decisions"
                element={
                  <ShellWrapper>
                    <Screen10Decisions />
                  </ShellWrapper>
                }
              />
              <Route
                path="/reports"
                element={
                  <ShellWrapper>
                    <RequireRole allowedRoles={['Admin', 'Coordinator']}>
                      <Screen11Reports />
                    </RequireRole>
                  </ShellWrapper>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ShellWrapper>
                    <Screen12Notifications />
                  </ShellWrapper>
                }
              />
              <Route
                path="/admin"
                element={
                  <ShellWrapper>
                    <RequireRole allowedRoles={['Admin']}>
                      <Screen13Admin />
                    </RequireRole>
                  </ShellWrapper>
                }
              />
              <Route
                path="/profile"
                element={
                  <ShellWrapper>
                    <Screen14Profile />
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
  );
}
