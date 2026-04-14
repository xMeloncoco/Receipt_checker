import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar.jsx';
import PageWrapper from './components/layout/PageWrapper.jsx';
import UploadPage from './pages/UploadPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import StoresPage from './pages/StoresPage.jsx';
import ItemsPage from './pages/ItemsPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageWrapper>
          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/stores" element={<StoresPage />} />
            <Route path="/items" element={<ItemsPage />} />
          </Routes>
        </PageWrapper>
      </div>
    </BrowserRouter>
  );
}
