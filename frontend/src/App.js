import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Curriculum from './Curriculum';
import StudentData from './StudentData';
import StudentsRecord from './StudentsRecord';
import StudentRecordDetail from './StudentRecordDetail';
import Login from './Login';

const AUTH_KEY = 'curriculum_auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

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

  const handleLoginSuccess = () => {
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
          <Route path="/students-data" element={<StudentData />} />
          <Route path="/record" element={<StudentsRecord />} />
          <Route path="/studentRecord/:courseCode" element={<StudentRecordDetail />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
