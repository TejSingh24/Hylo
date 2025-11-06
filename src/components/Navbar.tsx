import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Calculator } from 'lucide-react';
import './Dashboard.css';

const Navbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1 className="navbar-title">Hylo</h1>
          <span className="navbar-subtitle">Yield Toolkit</span>
        </div>

        <div className="navbar-links">
          <Link 
            to="/" 
            className={`navbar-link ${isActive('/') ? 'navbar-link-active' : ''}`}
          >
            <Home size={18} />
            <span>Home</span>
          </Link>

          <Link 
            to="/dashboard" 
            className={`navbar-link ${isActive('/dashboard') ? 'navbar-link-active' : ''}`}
          >
            <BarChart3 size={18} />
            <span>Strategy Dashboard</span>
          </Link>

          <Link 
            to="/calculator" 
            className={`navbar-link ${isActive('/calculator') ? 'navbar-link-active' : ''}`}
          >
            <Calculator size={18} />
            <span>Yield Calculator</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
