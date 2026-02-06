import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Calculator, TrendingUp } from 'lucide-react';
import './Dashboard.css';

const Navbar: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <h1 className="navbar-title">Hylo</h1>
            <span className="navbar-subtitle">Community Hub</span>
          </div>

          {/* Desktop Navigation Links */}
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

            <Link 
              to="/xsol-metrics" 
              className={`navbar-link ${isActive('/xsol-metrics') ? 'navbar-link-active' : ''}`}
            >
              <TrendingUp size={18} />
              <span>xSOL Metrics</span>
            </Link>
          </div>

          {/* Hamburger Button (Mobile Only) */}
          <button 
            className={`navbar-hamburger ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay - Now outside navbar as sibling */}
      <div className={`navbar-mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
        <Link 
          to="/" 
          className={`navbar-link ${isActive('/') ? 'navbar-link-active' : ''}`}
          onClick={closeMobileMenu}
        >
          <Home size={24} />
          <span>Home</span>
        </Link>

        <Link 
          to="/dashboard" 
          className={`navbar-link ${isActive('/dashboard') ? 'navbar-link-active' : ''}`}
          onClick={closeMobileMenu}
        >
          <BarChart3 size={24} />
          <span>Strategy Dashboard</span>
        </Link>

        <Link 
          to="/calculator" 
          className={`navbar-link ${isActive('/calculator') ? 'navbar-link-active' : ''}`}
          onClick={closeMobileMenu}
        >
          <Calculator size={24} />
          <span>Yield Calculator</span>
        </Link>

        <Link 
          to="/xsol-metrics" 
          className={`navbar-link ${isActive('/xsol-metrics') ? 'navbar-link-active' : ''}`}
          onClick={closeMobileMenu}
        >
          <TrendingUp size={24} />
          <span>xSOL Metrics</span>
        </Link>
      </div>
    </>
  );
};

export default Navbar;
