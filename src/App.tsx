import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TwoSelfieMood from './components/TwoSelfieMood';
import Callback from './components/Callback';
import SharePage from './components/SharePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TwoSelfieMood />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/share" element={<SharePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; 