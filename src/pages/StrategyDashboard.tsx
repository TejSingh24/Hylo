import React, { useState, useEffect } from 'react';
import { Search, ArrowUpDown, RefreshCw, Info } from 'lucide-react';
import type { AssetData } from '../services/ratexApi';
import { fetchAllAssets, getLastUpdated, checkAndRefreshIfStale } from '../services/ratexApi';
import AssetCard from '../components/AssetCard';
import '../components/Dashboard.css';

type SortOption = 'maturity' | 'leverage' | 'points' | 'dailyYield' | 'pointsPerDay' | 'risk';

const StrategyDashboard: React.FC = () => {
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AssetData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('maturity');
  const [selectedProjects, setSelectedProjects] = useState<string[]>(['Hylo']);
  const [selectedSources, setSelectedSources] = useState<string[]>(['ratex', 'exponent']);
  const [depositAmount, setDepositAmount] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [hasCheckedInitialFilter, setHasCheckedInitialFilter] = useState(false);

  // Define the projects to show in filters (in order)
  const FILTER_PROJECTS = ['Hylo', 'Huma', 'Perena', 'Onre'];

  // Project name mapping for special cases
  const getProjectForAsset = (asset: AssetData): string | null => {
    // Special case: USD*-YYMM tokens belong to Perena
    const baseAsset = asset.baseAsset || '';
    const assetName = asset.asset || '';
    
    if (baseAsset.includes('USD*') || assetName.includes('USD*')) {
      return 'Perena';
    }
    // Map PST assets to Huma
    if (baseAsset === 'PST' || assetName.includes('PST')) {
      return 'Huma';
    }
    // Exclude FLP and JLP from Onre - treat as Others
    if (baseAsset === 'FLP' || assetName.includes('FLP') || baseAsset === 'JLP' || assetName.includes('JLP')) {
      return 'Others';
    }
    // Map ONyc assets to Onre (standardize project name)
    if (baseAsset === 'ONyc' || assetName.includes('ONyc') || asset.projectName === 'ONyc' || asset.projectName === 'Onre') {
      return 'Onre';
    }
    return asset.projectName;
  };

  // Get project count for a specific project name
  const getProjectCount = (projectName: string): number => {
    if (projectName === 'Others') {
      // Count assets NOT in main filter projects
      return assets.filter(asset => {
        const assetProject = getProjectForAsset(asset);
        return assetProject && !FILTER_PROJECTS.includes(assetProject);
      }).length;
    }
    return assets.filter(asset => getProjectForAsset(asset) === projectName).length;
  };

  // Toggle project filter
  const toggleProjectFilter = (projectName: string) => {
    setSelectedProjects(prev => {
      if (prev.includes(projectName)) {
        // Remove if already selected
        return prev.filter(p => p !== projectName);
      } else {
        // Add if not selected
        return [...prev, projectName];
      }
    });
  };

  // Clear all filters (select All)
  const selectAllProjects = () => {
    setSelectedProjects([]);
  };

  // Toggle source filter
  const toggleSourceFilter = (source: string) => {
    setSelectedSources(prev => {
      if (prev.includes(source)) {
        const newSelection = prev.filter(s => s !== source);
        // If deselecting would leave nothing selected, select both instead
        if (newSelection.length === 0) {
          return ['ratex', 'exponent'];
        }
        return newSelection;
      } else {
        return [...prev, source];
      }
    });
  };

  // Get source count
  const getSourceCount = (source: string): number => {
    return assets.filter(asset => asset.source === source).length;
  };

  // Fetch assets on mount
  useEffect(() => {
    loadAssets();
  }, []);

  // Filter and sort assets when search term, sort option, selected projects, or assets change
  useEffect(() => {
    let filtered = [...assets];

    // Apply project filter (multi-select)
    if (selectedProjects.length > 0) {
      filtered = filtered.filter(asset => {
        const assetProject = getProjectForAsset(asset);
        
        if (selectedProjects.includes('Others')) {
          // If "Others" is selected, include assets NOT in main projects
          if (assetProject && !FILTER_PROJECTS.includes(assetProject)) {
            return true;
          }
        }
        
        // Check if asset's project is in selected projects
        return assetProject && selectedProjects.includes(assetProject);
      });
    }

    // Apply source filter (multi-select) - always filter by source
    if (selectedSources.length > 0) {
      filtered = filtered.filter(asset => selectedSources.includes(asset.source));
    } else {
      // If no sources selected, show no assets
      filtered = [];
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(asset =>
        asset.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.baseAsset && asset.baseAsset.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply sorting
    filtered = sortAssets(filtered, sortBy);

    setFilteredAssets(filtered);
  }, [assets, searchTerm, sortBy, selectedProjects, selectedSources]);

  const loadAssets = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check data age and trigger refresh if stale (>10 mins old)
      // This happens in background, doesn't block UI
      await checkAndRefreshIfStale();
      
      const data = await fetchAllAssets();
      setAssets(data);
      
      // Only on initial load: If default Hylo filter has 0 assets, show all instead
      if (!hasCheckedInitialFilter && selectedProjects.length === 1 && selectedProjects[0] === 'Hylo') {
        const hyloAssets = data.filter(asset => getProjectForAsset(asset) === 'Hylo');
        if (hyloAssets.length === 0) {
          console.log('⚠️ No Hylo assets found on initial load, defaulting to All projects');
          setSelectedProjects([]);
        }
        setHasCheckedInitialFilter(true);
      }
      
      const timestamp = await getLastUpdated();
      setLastUpdated(timestamp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assets');
      console.error('Error loading assets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sortAssets = (assetList: AssetData[], option: SortOption): AssetData[] => {
    const sorted = [...assetList];

    switch (option) {
      case 'maturity':
        // Sort by maturity days (ascending - soonest first)
        return sorted.sort((a, b) => {
          const daysA = a.maturityDays ?? Infinity;
          const daysB = b.maturityDays ?? Infinity;
          return daysA - daysB;
        });

      case 'leverage':
        // Sort by leverage (descending - highest first)
        return sorted.sort((a, b) => {
          const levA = a.leverage ?? 0;
          const levB = b.leverage ?? 0;
          return levB - levA;
        });

      case 'points':
        // Sort by total expected points (descending - highest first)
        return sorted.sort((a, b) => {
          const pointsA = a.totalExpectedPoints ?? 0;
          const pointsB = b.totalExpectedPoints ?? 0;
          return pointsB - pointsA;
        });

      case 'dailyYield':
        // Sort by daily yield rate (descending - highest first)
        return sorted.sort((a, b) => {
          const yieldA = a.dailyYieldRate ?? 0;
          const yieldB = b.dailyYieldRate ?? 0;
          return yieldB - yieldA;
        });

      case 'pointsPerDay':
        // Sort by expected points per day (descending - highest first)
        return sorted.sort((a, b) => {
          const pointsA = a.expectedPointsPerDay ?? 0;
          const pointsB = b.expectedPointsPerDay ?? 0;
          return pointsB - pointsA;
        });

      case 'risk':
        // Sort by downside risk (ascending - lowest risk first, N/A last)
        return sorted.sort((a, b) => {
          const riskA = a.downsideRisk;
          const riskB = b.downsideRisk;
          
          // Push N/A values to the end
          if (riskA === null || riskA === undefined) return 1;
          if (riskB === null || riskB === undefined) return -1;
          
          return Math.abs(riskA) - Math.abs(riskB);
        });

      default:
        return sorted;
    }
  };

  const getRelativeTime = (timestamp: string): string => {
    try {
      const now = new Date();
      const updated = new Date(timestamp);
      const diffMs = now.getTime() - updated.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'just now';
      if (diffMins === 1) return '1 min ago';
      if (diffMins < 60) return `${diffMins} mins ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours === 1) return '1 hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return '1 day ago';
      return `${diffDays} days ago`;
    } catch {
      return 'unknown';
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-title-section">
          <h1 className="dashboard-title">YT's Strategy/Risk Dashboard</h1>
          <p className="dashboard-subtitle">Monitor leveraged yield positions</p>
        </div>
        {lastUpdated && (
          <div className="dashboard-updated">
            Last updated: {getRelativeTime(lastUpdated)}
          </div>
        )}
      </div>

        {/* Controls */}
        <div className="dashboard-controls">
          {/* Search */}
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Sort By */}
          <div className="sort-box">
            <ArrowUpDown size={18} className="sort-icon" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="sort-select"
            >
              <option value="maturity">Sort by: Closest Maturity</option>
              <option value="points">Sort by: Total Points</option>
              <option value="pointsPerDay">Sort by: Points/Day</option>
              <option value="dailyYield">Sort by: Daily Yield</option>
              <option value="leverage">Sort by: Leverage</option>
              <option value="risk">Sort by: Lowest Risk</option>
            </select>
          </div>

          {/* Info Button */}
          <button
            onClick={() => setShowInfoModal(true)}
            className="info-button"
            title="Understanding metrics"
          >
            <Info size={18} />
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadAssets}
            disabled={isLoading}
            className="refresh-button"
            title="Refresh data"
          >
            <RefreshCw size={18} className={isLoading ? 'refresh-icon-spinning' : ''} />
          </button>
        </div>

        {/* Project Filters */}
        <div className="project-filters">
          <span className="filter-label">Projects:</span>
          <button
            className={`filter-pill ${selectedProjects.length === 0 ? 'active' : ''}`}
            onClick={selectAllProjects}
          >
            All <span className="filter-count">{assets.length}</span>
          </button>
          {FILTER_PROJECTS.map(projectName => {
            const count = getProjectCount(projectName);
            const isActive = selectedProjects.includes(projectName);
            
            return (
              <button
                key={projectName}
                className={`filter-pill ${isActive ? 'active' : ''}`}
                onClick={() => toggleProjectFilter(projectName)}
              >
                {projectName} <span className="filter-count">{count}</span>
              </button>
            );
          })}
          {/* Others button */}
          <button
            className={`filter-pill ${selectedProjects.includes('Others') ? 'active' : ''}`}
            onClick={() => toggleProjectFilter('Others')}
          >
            Others <span className="filter-count">{getProjectCount('Others')}</span>
          </button>
          
          {/* Source Filters */}
          <span className="filter-separator">|</span>
          <span className="filter-label">Source:</span>
          <button
            className={`filter-pill filter-pill-ratex ${selectedSources.includes('ratex') ? 'active' : ''}`}
            onClick={() => toggleSourceFilter('ratex')}
          >
            Rate-X <span className="filter-count">{getSourceCount('ratex')}</span>
          </button>
          <button
            className={`filter-pill filter-pill-exponent ${selectedSources.includes('exponent') ? 'active' : ''}`}
            onClick={() => toggleSourceFilter('exponent')}
          >
            Exponent <span className="filter-count">{getSourceCount('exponent')}</span>
          </button>
          
          {/* Amount Input */}
          <div className="amount-input-container">
            <label className="amount-label">Deposit Amount</label>
            <div className="amount-input-wrapper">
              <span className="amount-currency">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="amount-input"
                placeholder="1"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="dashboard-loading">
            <RefreshCw size={48} className="loading-spinner" />
            <p>Loading assets...</p>
          </div>
        ) : error ? (
          <div className="dashboard-error">
            <p className="error-message">Error: {error}</p>
            <button onClick={loadAssets} className="retry-button">
              Retry
            </button>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="dashboard-empty">
            <p>
              {searchTerm
                ? `No assets found matching "${searchTerm}"`
                : 'No assets available'}
            </p>
          </div>
        ) : (
          <div className="dashboard-grid">
            {filteredAssets.map((asset) => (
              <AssetCard key={asset.asset} asset={asset} depositAmount={depositAmount} />
            ))}
          </div>
        )}

        {/* Info Modal */}
        {showInfoModal && (
          <div className="modal-overlay" onClick={() => setShowInfoModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  <span className="modal-emoji">📊</span>
                  <span className="modal-title-text">Understanding Asset Card Metrics</span>
                </h2>
                <button className="modal-close" onClick={() => setShowInfoModal(false)}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="info-section">
                  <h3>CORE METRICS</h3>
                  <ul>
                    <li><strong>Asset Name:</strong> The yield-bearing token (Base Asset)</li>
                    <li><strong>Maturity Timer:</strong> Time till yield token expires</li>
                  </ul>
                </div>

                <div className="info-section">
                  <h3>PRICE & RANGE</h3>
                  <ul>
                    <li><strong>Price Range:</strong> Expected price fluctuation range based on Implied Yield Range</li>
                  </ul>
                </div>

                <div className="info-section">
                  <h3>YIELD & LEVERAGE</h3>
                  <ul>
                    <li><strong>Underlying APY:</strong> Annual Percentage Yield at current market conditions, a 7-day Average</li>
                    <li><strong>Implied Yield:</strong> Market's expected yield based on YT pricing</li>
                    <li><strong>Leverage:</strong> How much your yield is amplified (e.g., 2x = double the base yield)</li>
                  </ul>
                </div>

                <div className="info-section">
                  <h3>PERFORMANCE METRICS</h3>
                  <ul>
                    <li><strong>Expected Recovery Yield:</strong> Total Percentage Recovery of underlyin asset (Not $ value) possible through Yields, if hold till maturity</li>
                    <li><strong>Daily Decay Rate:</strong> Daily percentage decrease in yield value due to time passing, for the same Implied Yield. Decay happens during Yield distribution</li>
                    <li><strong>Upside Potential:</strong> Maximum potential gain possible for today if implied yield increases to upper range (Approx. with deviation of 0.5-1%)</li>
                    <li><strong>Downside Risk:</strong> Maximum Potential loss possible for today if implied yield decreases to lower range (Approx. with deviation of 0.5-1%)</li>
                  </ul>
                </div>

                <div className="info-section">
                  <h3>POINTS TRACKING</h3>
                  <ul>
                    <li><strong>Expected Points/Day:</strong> Projected reward points earned daily (scales with your deposit amount)</li>
                    <li><strong>Total Expected Points:</strong> Total points by maturity date (scales with your deposit amount)</li>
                    <li><strong>Boost:</strong> Additional multiplier for point earnings (if applicable)</li>
                  </ul>
                </div>

                <div className="info-section">
                  <h3>LAST DAY YT VALUE</h3>
                  <ul>
                    <li><strong>Current Implied Yield:</strong> Expected YT value based on current market yield</li>
                    <li><strong>Yield's Lower Range:</strong> Expected YT value if yield drops to lower bound</li>
                    <li>Shows percentage of your investment remaining at 1 day from maturity</li>
                  </ul>
                </div>

                <div className="info-tips">
                  <p>💡 <strong>Tip:</strong> All point calculations update based on your "Deposit Amount" setting</p>
                  <p>💡 <strong>Note:</strong> Data updates every 5 minutes. When someone visits and if last updated &lt;10 minutes - hard refresh (1.5-2 Minutes)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="home-footer">
          <p>
            Data is automatically updated every 5 minutes. If data is older than 10 minutes when someone visits, a hard refresh (1-2 minutes) updates all metrics to ensure accuracy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StrategyDashboard;
