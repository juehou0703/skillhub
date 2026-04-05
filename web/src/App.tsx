import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import DashboardPage from './pages/DashboardPage';
import CreatorPage from './pages/CreatorPage';
import BookshelfPage from './pages/BookshelfPage';
import DocsPage from './pages/DocsPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/bookshelf" element={<BookshelfPage />} />
        <Route path="/creator" element={<CreatorPage />} />
        <Route path="/docs" element={<DocsPage />} />
      </Routes>
    </Layout>
  );
}
