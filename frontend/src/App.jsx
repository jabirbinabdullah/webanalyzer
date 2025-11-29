import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Analyze from './pages/Analyze';
import History from './pages/History';

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>WebAnalyzer</h1>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Analyze />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
    </div>
  );
}
