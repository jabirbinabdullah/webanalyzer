import React, { useContext } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Analyze from './pages/Analyze';
import History from './pages/History';
import RecentResults from './pages/RecentResults';
import Compare from './pages/Compare';
import Login from './pages/Login';
import Register from './pages/Register';
import Portfolio from './pages/Portfolio';
import Profile from './pages/Profile';
import AuthContext from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import ThemeToggle from './components/ThemeToggle';

import Dashboard from './pages/Dashboard';

export default function App() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="app">
      <header className="header">
        <h1>
          <Link to="/">WebAnalyzer</Link>
        </h1>
        <nav>
          <Link to="/">Analyze</Link>
          {user && <Link to="/dashboard">Dashboard</Link>}
          <Link to="/compare">Compare</Link>
          <Link to="/recent-results">Recent Results</Link>
          {user && <Link to="/portfolio">Portfolio</Link>}
          {user && <Link to="/history">History</Link>}
          {user ? (
            <>
              <Link to="/profile">Profile</Link>
              <button onClick={logout} className="btn-link">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Analyze />} />
          <Route path="/dashboard" element={<PrivateRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
          <Route path="/compare" element={<Compare />} />
          <Route path="/recent-results" element={<RecentResults />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/history" element={<PrivateRoute />}>
            <Route path="/history" element={<History />} />
          </Route>
          <Route path="/portfolio" element={<PrivateRoute />}>
            <Route path="/portfolio" element={<Portfolio />} />
          </Route>
          <Route path="/profile" element={<PrivateRoute />}>
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}
