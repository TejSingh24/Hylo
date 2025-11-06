import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Calculator, ArrowRight } from 'lucide-react';
import '../components/Dashboard.css';

const Home: React.FC = () => {
  return (
    <div className="home-page">
      <div className="home-container">
        {/* Hero Section */}
        <div className="home-hero">
          <h1 className="home-title">
            Hylo Yield Toolkit
          </h1>
          <p className="home-subtitle">
            Comprehensive tools for analyzing and calculating yields on your leveraged yield token positions
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
                Monitor all your leveraged yield positions with comprehensive risk analysis, 
                upside potential, downside risk, and projected points earnings.
              </p>
              <ul className="home-card-features">
                <li>Real-time risk metrics & analysis</li>
                <li>Track upside potential & downside risk</li>
                <li>Monitor all assets in one place</li>
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
              <h2 className="home-card-title">YT Yield Calculator</h2>
              <p className="home-card-description">
                Calculate expected yield returns for your leveraged yield token positions. 
                Enter parameters manually or fetch live data from Rate-X.
              </p>
              <ul className="home-card-features">
                <li>Manual & auto-fetch modes</li>
                <li>Gross & net yield calculations</li>
                <li>Expected points projections</li>
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
          Data is automatically updated every 5 minutes via GitHub Actions
        </div>
      </div>
    </div>
  );
};

export default Home;
