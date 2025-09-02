
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TimeTrackingApp } from './components/TimeTrackingApp';
import { Auth } from './pages/Auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <TimeTrackingApp />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="*" 
          element={
            <ProtectedRoute>
              <TimeTrackingApp />
            </ProtectedRoute>
          } 
        />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
