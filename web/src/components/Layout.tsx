import { NavLink, Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-left">
          <Link to="/" className="nav-brand">
            <span className="nav-brand-skill">Skill</span><span className="nav-brand-hub">Hub</span>
          </Link>
          <div className="nav-links">
            <NavLink to="/browse" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Browse
            </NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Dashboard
            </NavLink>
            <NavLink to="/bookshelf" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Bookshelf
            </NavLink>
            <NavLink to="/creator" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Creator
            </NavLink>
            <NavLink to="/docs" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Docs
            </NavLink>
          </div>
        </div>
        <div className="navbar-right">
          <span className="nav-tagline">The Claude skill marketplace</span>
          <Link to="/browse" className="btn btn-primary btn-sm nav-cta">
            Get Started
          </Link>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
