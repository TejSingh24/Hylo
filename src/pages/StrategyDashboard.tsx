import React, { useState, useEffect } from 'react';
import { Search, ArrowUpDown, RefreshCw } from 'lucide-react';
import type { AssetData } from '../services/ratexApi';
import { fetchAllAssets, getLastUpdated } from '../services/ratexApi';
import AssetCard from '../components/AssetCard';
import '../components/Dashboard.css';

type SortOption = 'maturity' | 'leverage' | 'points' | 'upside' | 'risk';

const StrategyDashboard: React.FC = () => {
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AssetData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('maturity');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch assets on mount
  useEffect(() => {
    loadAssets();
  }, []);

  // Filter and sort assets when search term, sort option, or assets change
  useEffect(() => {
    let filtered = [...assets];

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
  }, [assets, searchTerm, sortBy]);

  const loadAssets = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchAllAssets();
      setAssets(data);
      
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

      case 'upside':
        // Sort by upside potential (descending - highest first)
        return sorted.sort((a, b) => {
          const upsideA = a.upsidePotential ?? 0;
          const upsideB = b.upsidePotential ?? 0;
          return upsideB - upsideA;
        });

      case 'risk':
        // Sort by downside risk (ascending - lowest risk first)
        return sorted.sort((a, b) => {
          const riskA = Math.abs(a.downsideRisk ?? 0);
          const riskB = Math.abs(b.downsideRisk ?? 0);
          return riskA - riskB;
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
            <h1 className="dashboard-title">Strategy Dashboard</h1>
            <p className="dashboard-subtitle">Monitor your leveraged yield positions</p>
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
              <option value="leverage">Sort by: Highest Leverage</option>
              <option value="points">Sort by: Highest Points</option>
              <option value="upside">Sort by: Highest Upside</option>
              <option value="risk">Sort by: Lowest Risk</option>
            </select>
          </div>

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
              <AssetCard key={asset.asset} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyDashboard;
