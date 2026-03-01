import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Curriculum from './Curriculum';
import CreateCourse from './CreateCourse';
import MapCourseQuestions from './MapCourseQuestions';
import StudentData from './StudentData';
import StudentsRecord from './StudentsRecord';
import StudentRecordDetail from './StudentRecordDetail';
import Reports from './Reports';
import StudentReportDetail from './StudentReportDetail';
import GradingScheme from './GradingScheme';
import Login from './Login';
import { API_URL } from './config/api';

const AUTH_KEY = 'curriculum_auth';
const INACTIVITY_MS = 20 * 60 * 1000;   // 20 minutes
const REFRESH_INTERVAL_MS = 2 * 60 * 1000;  // check every 2 min to refresh if active
const ACTIVITY_THRESHOLD_MS = 90 * 1000;     // consider "active" if activity in last 90 sec

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      const auth = raw ? JSON.parse(raw) : null;
      setIsAuthenticated(!!auth?.token && !!auth?.username);
    } catch (_) {
      setIsAuthenticated(false);
    }
    setChecking(false);
  }, []);

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
          <Route path="/" element={<Curriculum />} />
          <Route path="/create-course" element={<CreateCourse />} />
          <Route path="/create-course/map-questions" element={<MapCourseQuestions />} />
          <Route path="/students-data" element={<StudentData />} />
          <Route path="/record" element={<StudentsRecord />} />
          <Route path="/studentRecord/:courseCode" element={<StudentRecordDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/student/:registrationNumber" element={<StudentReportDetail />} />
          <Route path="/grading-scheme" element={<GradingScheme />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
