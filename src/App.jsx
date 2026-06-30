import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './login';
import AdminDashboard from './AdminDashboard';
import RhDashboard from './RhDashboard';
import GestorDashboard from './GestorDashboard';
import ColaboradorDashboard from './ColaboradorDashboard';
import PrivacyPolicy from './PrivacyPolicy';
import Toaster from './components/Toast';
import SiteFooter from './components/SiteFooter';
import ErrorBoundary from './components/ErrorBoundary';
import { TooltipProvider } from '@/components/ui/tooltip';

function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <BrowserRouter>
          <Toaster />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/rh" element={<RhDashboard />} />
            <Route path="/gestor" element={<GestorDashboard />} />
            <Route path="/colaborador" element={<ColaboradorDashboard />} />
            <Route path="/privacidade" element={<PrivacyPolicy />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <SiteFooter />
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;