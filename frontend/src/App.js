import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Curriculum from './Curriculum';
import CreateCourse from './CreateCourse';
import CreateCourseMarks from './CreateCourseMarks';
import MapCourseQuestions from './MapCourseQuestions';
import StudentData from './StudentData';
import StudentsRecord from './StudentsRecord';
import StudentRecordDetail from './StudentRecordDetail';
import Reports from './Reports';
import ResultSheet from './ResultSheet';
import StudentReportDetail from './StudentReportDetail';
import GradingScheme from './GradingScheme';
import Login from './Login';
import { API_URL } from './config/api';
import RolesDashboard from './RolesDashboard';
import CourseAdmins from './CourseAdmins';

const AUTH_KEY = 'curriculum_auth';
const INACTIVITY_MS = 20 * 60 * 1000;   // 20 minutes
const REFRESH_INTERVAL_MS = 2 * 60 * 1000;  // check every 2 min to refresh if active
const ACTIVITY_THRESHOLD_MS = 90 * 1000;     // consider "active" if activity in last 90 sec

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [checking, setChecking] = useState(true);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      const auth = raw ? JSON.parse(raw) : null;
      const authenticated = !!auth?.token && !!auth?.username;
      setIsAuthenticated(authenticated);

      if (!authenticated) {
        setUserRole(null);
        setChecking(false);
        return;
      }

      // Role fetch is required for RBAC-aware UI.
      axios
        .get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        })
        .then((res) => {
          const role = res.data?.user?.role || 'ADMIN';
          setUserRole(role);

          auth.role = role;
          localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
        })
        .catch(() => {
          setIsAuthenticated(false);
          setUserRole(null);
          localStorage.removeItem(AUTH_KEY);
        })
        .finally(() => setChecking(false));
    } catch (_) {
      setIsAuthenticated(false);
      setUserRole(null);
      localStorage.removeItem(AUTH_KEY);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (userRole) return;

    try {
      const raw = localStorage.getItem(AUTH_KEY);
      const auth = raw ? JSON.parse(raw) : null;
      if (!auth?.token) return;

      setChecking(true);
      axios
        .get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        })
        .then((res) => {
          const role = res.data?.user?.role || 'ADMIN';
          setUserRole(role);
          auth.role = role;
          localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
        })
        .catch(() => {
          setIsAuthenticated(false);
          setUserRole(null);
          localStorage.removeItem(AUTH_KEY);
        })
        .finally(() => setChecking(false));
    } catch (_) {
      setIsAuthenticated(false);
      setUserRole(null);
      localStorage.removeItem(AUTH_KEY);
      setChecking(false);
    }
  }, [isAuthenticated, userRole]);

  // Inactivity logout and token refresh when user is active (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((ev) => window.addEventListener(ev, updateActivity));

    const inactivityInterval = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_MS) {
        localStorage.removeItem(AUTH_KEY);
        window.location.reload();
      }
    }, 60000); // check every 1 minute

    const refreshInterval = setInterval(() => {
      if (Date.now() - lastActivityRef.current > ACTIVITY_THRESHOLD_MS) return;
      try {
        const raw = localStorage.getItem(AUTH_KEY);
        const auth = raw ? JSON.parse(raw) : null;
        if (!auth?.token) return;
        axios.get(`${API_URL}/api/auth/refresh`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        }).then((res) => {
          if (res.data?.token) {
            auth.token = res.data.token;
            localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
          }
        }).catch(() => {});
      } catch (_) {}
    }, REFRESH_INTERVAL_MS);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, updateActivity));
      clearInterval(inactivityInterval);
      clearInterval(refreshInterval);
    };
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    lastActivityRef.current = Date.now();
    setIsAuthenticated(true);
  };

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Login onLoginSuccess={handleLoginSuccess} />
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/"
            element={
              userRole === 'EDUCATOR' || userRole === 'COURSE_ADMIN' ? (
                <Navigate to="/record" replace />
              ) : (
                <Curriculum />
              )
            }
          />
          <Route path="/create-course" element={userRole === 'EDUCATOR' ? <Navigate to="/record" replace /> : <CreateCourse />} />
          <Route path="/create-course/marks" element={userRole === 'EDUCATOR' ? <Navigate to="/record" replace /> : <CreateCourseMarks />} />
          <Route path="/create-course/map-questions" element={userRole === 'EDUCATOR' ? <Navigate to="/record" replace /> : <MapCourseQuestions />} />
          <Route
            path="/students-data"
            element={userRole === 'ADMIN' ? <StudentData /> : <Navigate to="/record" replace />}
          />
          <Route path="/record" element={<StudentsRecord />} />
          <Route path="/studentRecord/:courseCode" element={<StudentRecordDetail />} />
          <Route path="/roles" element={userRole === 'ADMIN' ? <RolesDashboard /> : <Navigate to="/record" replace />} />
          <Route
            path="/course-admins"
            element={userRole === 'ADMIN' ? <CourseAdmins /> : <Navigate to="/" replace />}
          />
          <Route path="/reports" element={userRole === 'EDUCATOR' ? <Navigate to="/record" replace /> : <Reports />} />
          <Route path="/reports/result-sheet" element={userRole === 'EDUCATOR' ? <Navigate to="/record" replace /> : <ResultSheet />} />
          <Route
            path="/reports/student/:registrationNumber"
            element={userRole === 'EDUCATOR' ? <Navigate to="/record" replace /> : <StudentReportDetail />}
          />
          <Route path="/grading-scheme" element={userRole === 'ADMIN' ? <GradingScheme /> : <Navigate to="/record" replace />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
