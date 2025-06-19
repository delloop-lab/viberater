import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SelfieMood from './components/SelfieMood';
import Callback from './components/Callback';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SelfieMood />} />
        <Route path="/callback" element={<Callback />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; 