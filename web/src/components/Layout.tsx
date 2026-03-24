import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">SkillHub</div>
        <div className="nav-links">
          <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Browse
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Dashboard
          </NavLink>
          <NavLink to="/creator" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Creator
          </NavLink>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
