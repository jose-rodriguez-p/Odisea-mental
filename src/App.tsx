import React, { useState, useEffect } from 'react';
import { PerfilUsuario } from './types';
import { db } from './supabaseClient';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { DocenteDashboard } from './components/DocenteDashboard';
import { GameContainer } from './components/GameContainer';
import { Sparkles } from 'lucide-react';

type ViewState = 'loading' | 'login' | 'dashboard' | 'docente' | 'game';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('loading');
  const [currentUser, setCurrentUser] = useState<PerfilUsuario | null>(null);
  
  // Estados para lanzar minijuegos
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedSessionNum, setSelectedSessionNum] = useState<number | undefined>(undefined);

  // Comprobar si hay una sesión activa en el montaje
  useEffect(() => {
    const initSession = async () => {
      try {
        const user = await db.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setView(user.rol === 'docente' ? 'docente' : 'dashboard');
        } else {
          setView('login');
        }
      } catch (err) {
        console.error('Error inicializando sesión:', err);
        setView('login');
      }
    };
    initSession();
  }, []);

  const handleLoginSuccess = (profile: PerfilUsuario) => {
    setCurrentUser(profile);
    setView(profile.rol === 'docente' ? 'docente' : 'dashboard');
  };

  const handleLogout = async () => {
    try {
      setView('loading');
      await db.signOut();
      setCurrentUser(null);
      setSelectedGameId(null);
      setSelectedSessionNum(undefined);
      setView('login');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  const handleSelectGame = (gameId: number, sessionNum?: number) => {
    setSelectedGameId(gameId);
    setSelectedSessionNum(sessionNum);
    setView('game');
  };

  const handleBackToDashboard = () => {
    setSelectedGameId(null);
    setSelectedSessionNum(undefined);
    setView(currentUser?.rol === 'docente' ? 'docente' : 'dashboard');
  };

  // Renderizar la vista activa
  return (
    <div className="min-h-screen space-grid">
      
      {/* Vista de Carga */}
      {view === 'loading' && (
        <div className="min-h-screen flex items-center justify-center text-white">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-brand-violet/20 border border-brand-cyan/40 flex items-center justify-center mx-auto animate-spin">
              <Sparkles className="w-6 h-6 text-brand-cyan" />
            </div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest animate-pulse">
              Conectando con el satélite cognitivo...
            </p>
          </div>
        </div>
      )}

      {/* Login / Registro */}
      {view === 'login' && (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}

      {/* Dashboard Estudiante */}
      {view === 'dashboard' && currentUser && (
        <Dashboard
          profile={currentUser}
          onLogout={handleLogout}
          onSelectGame={handleSelectGame}
        />
      )}

      {/* Panel Docente */}
      {view === 'docente' && currentUser && (
        <DocenteDashboard
          profile={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* Contenedor de Juego Activo */}
      {view === 'game' && currentUser && selectedGameId !== null && (
        <GameContainer
          gameId={selectedGameId}
          sessionNum={selectedSessionNum}
          profile={currentUser}
          onBackToDashboard={handleBackToDashboard}
        />
      )}

    </div>
  );
};

export default App;
