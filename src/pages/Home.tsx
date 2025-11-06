import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Calculator, ArrowRight, TrendingUp, Shield } from 'lucide-react';
import '../components/Dashboard.css';

const Home: React.FC = () => {
  return (
    <div className="home-page">
      <div className="home-container">
        {/* Hero Section */}
        <div className="home-hero">
          <h1 className="home-title">
            Hylo-RateX Yield Toolkit
          </h1>
          <p className="home-subtitle">
            Comprehensive tools for analyzing and calculating yields/points for all Rate-X available tokens
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="home-cards">
          {/* Strategy Dashboard Card */}
          <Link to="/dashboard" className="home-card home-card-dashboard">
            <div className="home-card-icon">
              <BarChart3 size={48} />
            </div>
            <div className="home-card-content">
              <h2 className="home-card-title">YT's Strategy/Risk Dashboard</h2>
              <p className="home-card-description">
                Monitor leveraged yield positions with comprehensive risk analysis, 
                upside potential, downside risk, and projected points earnings.
              </p>
              <ul className="home-card-features">
                <li>
                  <Shield size={16} />
                  <span>Live market metrics and analysis</span>
                </li>
                <li>
                  <TrendingUp size={16} />
                  <span>Track upside potential & downside risk</span>
                </li>
                <li>
                  <BarChart3 size={16} />
                  <span>Monitor all assets in one place</span>
                </li>
              </ul>
            </div>
            <div className="home-card-action">
              <span>View Dashboard</span>
              <ArrowRight size={20} />
            </div>
          </Link>

          {/* Yield Calculator Card */}
          <Link to="/calculator" className="home-card home-card-calculator">
            <div className="home-card-icon">
              <Calculator size={48} />
            </div>
            <div className="home-card-content">
              <h2 className="home-card-title">YT Yield/Point Calculator</h2>
              <p className="home-card-description">
                Calculate expected yield returns or points for your leveraged yield token positions. 
                Enter parameters manually or fetch live data from Rate-X.
              </p>
              <ul className="home-card-features">
                <li>
                  <Calculator size={16} />
                  <span>Manual & auto-fetch modes</span>
                </li>
                <li>
                  <TrendingUp size={16} />
                  <span>Gross & net yield calculations</span>
                </li>
                <li>
                  <BarChart3 size={16} />
                  <span>Expected points projections</span>
                </li>
              </ul>
            </div>
            <div className="home-card-action">
              <span>Open Calculator</span>
              <ArrowRight size={20} />
            </div>
          </Link>
        </div>

        {/* Footer Info */}
        <div className="home-footer">
          <p className="home-footer-text">
            Data is automatically updated every 5 minutes. If data is older than 10 minutes when someone visits, a hard refresh (1-2 minutes) updates all metrics to ensure accuracy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
