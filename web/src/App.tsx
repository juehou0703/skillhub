import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import BrowsePage from './pages/BrowsePage';
import DashboardPage from './pages/DashboardPage';
import CreatorPage from './pages/CreatorPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/creator" element={<CreatorPage />} />
      </Routes>
    </Layout>
  );
}
