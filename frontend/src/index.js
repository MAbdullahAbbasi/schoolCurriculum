import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const AUTH_KEY = 'curriculum_auth';

axios.interceptors.request.use((config) => {
  if (config.url?.includes('/api/auth/login')) return config;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    const auth = raw ? JSON.parse(raw) : null;
    if (auth?.token) config.headers.Authorization = `Bearer ${auth.token}`;
  } catch (_) {}
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(AUTH_KEY);
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
