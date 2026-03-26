import { useState, useEffect } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import LandingPage from './components/LandingPage';
import QueryPage from './components/QueryPage';
import LoginPage from './components/LoginPage';
import { API_BASE } from './api';

export default function App() {
  const [appState, setAppState] = useState<{
    view: 'auth' | 'loading' | 'landing' | 'query';
    data: any | null;
    user: string | null;
  }>({ view: 'auth', data: null, user: null });

  const checkTablesAndRoute = async (email: string) => {
    setAppState(prev => ({ ...prev, view: 'loading', user: email }));
    try {
      const res = await fetch(`${API_BASE}/api/tables?userId=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAppState(prev => ({ ...prev, view: 'query' }));
      } else {
        setAppState(prev => ({ ...prev, view: 'landing' }));
      }
    } catch {
      setAppState(prev => ({ ...prev, view: 'landing' }));
    }
  };

  useEffect(() => {
    getCurrentUser().then(user => {
      const email = user.signInDetails?.loginId || '';
      checkTablesAndRoute(email);
    }).catch(() => {});
  }, []);

  const handleLogin = (email: string) => {
    checkTablesAndRoute(email);
  };

  const handleUploadComplete = (data: any) => {
    setAppState(prev => ({ ...prev, view: 'query', data }));
  };

  const handleSignOut = async () => {
    await signOut();
    setAppState({ view: 'auth', data: null, user: null });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {appState.view === 'auth' && <LoginPage onLogin={handleLogin} />}
      {appState.view === 'loading' && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
      {appState.view === 'landing' && <LandingPage onUploadComplete={handleUploadComplete} userId={appState.user || 'default'} />}
      {appState.view === 'query' && (
        <QueryPage initialData={appState.data} userEmail={appState.user || ''} onSignOut={handleSignOut} />
      )}
    </div>
  );
}
