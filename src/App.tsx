import { useState, useEffect, useRef } from 'react'
import './App.css'
import './components/CardHighlights.css'
import { Info, TrendingUp, Clock, Percent, Calculator, Zap, RefreshCw, Pencil } from 'lucide-react';
import { refreshCache, checkHealth, type AssetData } from './services/ratexApi';

function App() {
  // Calculator mode: 'manual' or 'auto'
  const [mode, setMode] = useState<'manual' | 'auto'>('manual')
  
  // Manual mode states
  const [leverage, setLeverage] = useState('')
  const [apy, setApy] = useState('')
  const [maturityDays, setMaturityDays] = useState('')
  
  // Auto mode states
  const [availableAssets, setAvailableAssets] = useState<AssetData[]>([])
  const [selectedAsset, setSelectedAsset] = useState<string>('')
  const [autoData, setAutoData] = useState<AssetData | null>(null)
  const [isFetchingAssets, setIsFetchingAssets] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [hasFetchedData, setHasFetchedData] = useState(false)
  
  // Editable states for auto mode
  const [isEditingLeverage, setIsEditingLeverage] = useState(false)
  const [isEditingApy, setIsEditingApy] = useState(false)
  const [isEditingMaturity, setIsEditingMaturity] = useState(false)
  const [isEditingAssetBoost, setIsEditingAssetBoost] = useState(false)
  const [isEditingRatexBoost, setIsEditingRatexBoost] = useState(false)
  const [editableLeverage, setEditableLeverage] = useState<string>('')
  const [editableApy, setEditableApy] = useState<string>('')
  const [editableMaturity, setEditableMaturity] = useState<string>('')
  const [editableAssetBoost, setEditableAssetBoost] = useState<string>('')
  const [editableRatexBoost, setEditableRatexBoost] = useState<string>('')
  
  // Searchable dropdown states
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  
  // Shared states
  const [yieldReturn, setYieldReturn] = useState<{ gross: number; net: number } | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  
  // Wake up backend on page load (only once)
  useEffect(() => {
    const wakeUpBackend = async () => {
      try {
        console.log('🌅 Waking up backend server...');
        await checkHealth();
        console.log('✅ Backend is awake and ready!');
      } catch (error) {
        console.log('⚠️ Backend wake-up ping failed (this is normal if backend is sleeping)');
        // Silent fail - user doesn't need to see this error
      }
    };
    
    wakeUpBackend();
  }, []); // Empty dependency array = run once on mount
  
  // Scroll to result when it appears
  useEffect(() => {
    if (yieldReturn !== null && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [yieldReturn]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setSearchTerm('');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const calculateYieldReturn = () => {
    setIsCalculating(true)

    setTimeout(() => {
      // Get values based on mode
      let leverageNum: number;
      let apyNum: number;
      let maturityDaysNum: number;

      if (mode === 'auto' && autoData) {
        leverageNum = autoData.leverage || 0;
        apyNum = (autoData.apy || 0) / 100;
        maturityDaysNum = autoData.maturityDays || 0;
      } else {
        leverageNum = parseFloat(leverage);
        apyNum = parseFloat(apy) / 100;
        maturityDaysNum = parseFloat(maturityDays);
      }

      if (isNaN(leverageNum) || isNaN(apyNum) || isNaN(maturityDaysNum)) {
        alert('Please enter valid numbers or fetch asset data')
        setIsCalculating(false)
        return
      }

      const grossResult = leverageNum * (Math.pow(1 + apyNum, 1 / 365) - 1) * 365 * (maturityDaysNum / 365) * 100
      const netResult = grossResult * 0.995 // Platform takes 0.5% of yield
      setYieldReturn({ gross: grossResult, net: netResult })
      setIsCalculating(false)
    }, 300)
  }

  // Fetch ALL assets data from Rate-X (Auto mode)
  // Always fetches fresh data from Rate-X, bypassing cache
  // Includes automatic retry logic for timeout errors
  const fetchAllAssetsHandler = async () => {
    setIsFetchingAssets(true);
    setFetchError(null);
    
    const maxAttempts = 2; // Try once, retry once if fails
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Fetch attempt ${attempt}/${maxAttempts}...`);
        
        // Use refreshCache to force fresh scrape from Rate-X
        const assets = await refreshCache();
        setAvailableAssets(assets);
        setHasFetchedData(true);
        
        // If user has already selected an asset, update it with fresh data
        if (selectedAsset) {
          const updatedAssetData = assets.find(a => a.asset === selectedAsset);
          if (updatedAssetData) {
            setAutoData(updatedAssetData);
            // Update editable values with fresh fetched data
            setEditableLeverage(String(updatedAssetData.leverage || 0));
            setEditableApy(String(updatedAssetData.apy || 0));
            setEditableMaturity(String(updatedAssetData.maturityDays || 0));
            setEditableAssetBoost(String(updatedAssetData.assetBoost || 0));
            setEditableRatexBoost(String(updatedAssetData.ratexBoost || 0));
            
            // Recalculate with fresh data
            setIsCalculating(true);
            setTimeout(() => {
              const leverageNum = updatedAssetData.leverage || 0;
              const apyNum = (updatedAssetData.apy || 0) / 100;
              const maturityDaysNum = updatedAssetData.maturityDays || 0;
              
              if (leverageNum > 0 && maturityDaysNum > 0) {
                const grossResult = leverageNum * (Math.pow(1 + apyNum, 1 / 365) - 1) * 365 * (maturityDaysNum / 365) * 100;
                const netResult = grossResult * 0.995;
                setYieldReturn({ gross: grossResult, net: netResult });
              }
              
              setIsCalculating(false);
            }, 300);
          }
        }
        
        // Success! Break out of retry loop
        setIsFetchingAssets(false);
        return;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Failed to fetch assets data');
        console.log(`Attempt ${attempt} failed:`, lastError.message);
        
        // If this is not the last attempt, wait before retrying
        if (attempt < maxAttempts) {
          console.log('Retrying in 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        }
      }
    }
    
    // All attempts failed - show error to user
    if (lastError) {
      const errorMessage = lastError.message;
      setFetchError(errorMessage);
      
      // Show user-friendly error message
      if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        alert(
          `⚠️ Unable to connect to backend server.\n\n` +
          `Tried ${maxAttempts} times but request timed out.\n\n` +
          `This may be because:\n` +
          `• Backend is still starting up (wait 30s and try again)\n` +
          `• Request is taking longer than expected\n` +
          `• Backend server might be down\n\n` +
          `Please wait a moment and click "Fetch" again.`
        );
      } else {
        alert(`Error: ${errorMessage}\n\nPlease try again in a few moments.`);
      }
    }
    
    setIsFetchingAssets(false);
  };

  // Calculate yield for selected asset (Auto mode)
  const calculateAutoYield = () => {
    if (!hasFetchedData) {
      alert('Please click "Fetch" first to get asset data from Rate-X');
      return;
    }

    if (!selectedAsset) {
      alert('Please select an asset from the dropdown');
      return;
    }

    // Find the selected asset in the fetched data
    const assetData = availableAssets.find(a => a.asset === selectedAsset);
    
    if (!assetData) {
      alert('Selected asset not found. Please fetch data again.');
      return;
    }

    setAutoData(assetData);
    // Initialize editable values with fetched data
    setEditableLeverage(String(assetData.leverage || 0));
    setEditableApy(String(assetData.apy || 0));
    setEditableMaturity(String(assetData.maturityDays || 0));
    setEditableAssetBoost(String(assetData.assetBoost || 0));
    setEditableRatexBoost(String(assetData.ratexBoost || 0));
    setIsCalculating(true);

    setTimeout(() => {
      // Use editable values if they exist and are being edited, otherwise use original data
      const leverageNum = editableLeverage ? parseFloat(editableLeverage) : (assetData.leverage || 0);
      const apyNum = (editableApy ? parseFloat(editableApy) : (assetData.apy || 0)) / 100;
      const maturityDaysNum = editableMaturity ? parseFloat(editableMaturity) : (assetData.maturityDays || 0);
      
      if (leverageNum > 0 && maturityDaysNum > 0) {
        const grossResult = leverageNum * (Math.pow(1 + apyNum, 1 / 365) - 1) * 365 * (maturityDaysNum / 365) * 100;
        const netResult = grossResult * 0.995;
        setYieldReturn({ gross: grossResult, net: netResult });
      } else {
        alert('Invalid asset data. Please try fetching again.');
      }
      
      setIsCalculating(false);
    }, 300);
  };
  
  // Recalculate when editable values change
  const recalculateYield = () => {
    if (!autoData) return;
    
    setIsCalculating(true);
    setTimeout(() => {
      const leverageNum = parseFloat(editableLeverage) || 0;
      const apyNum = (parseFloat(editableApy) || 0) / 100;
      const maturityDaysNum = parseFloat(editableMaturity) || 0;
      
      if (leverageNum > 0 && maturityDaysNum > 0) {
        const grossResult = leverageNum * (Math.pow(1 + apyNum, 1 / 365) - 1) * 365 * (maturityDaysNum / 365) * 100;
        const netResult = grossResult * 0.995;
        setYieldReturn({ gross: grossResult, net: netResult });
      }
      
      setIsCalculating(false);
    }, 300);
  };

  // No auto-loading on mount - user clicks "Fetch" button
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (mode === 'auto') {
        // In auto mode, Enter key calculates (user must fetch first)
        calculateAutoYield();
      } else {
        calculateYieldReturn();
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient">
      {/* Animated background elements */}
      <div className="background-elements">
        <div className="bg-circle-1"></div>
        <div className="bg-circle-2"></div>
      </div>
      <div className="relative w-full max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-16 max-w-2xl">
            {/* Header Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl" style={{marginBottom:10}}>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-2 rounded-lg" style={{margin:7}}>
                  <Info className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Hylo Asset Yield Calculator for Rate-X</h2>
              </div>
              <p className="text-purple-200 text-sm" style={{marginLeft: 35, marginTop: 8, marginBottom: 10, lineHeight: 1.7}}>
                Find the values from your Hylo asset card and enter them below. The highlighted areas show exactly where each value is located.
              </p>
            </div>

            {/* Screenshot with Annotations */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl mb-16" style={{marginBottom:0}}>
              <h3 className="text-white font-semibold mb-4 text-center">Reference Card Example</h3>

              {/* Card Screenshot Container */}
              <div className="flex flex-col items-center justify-center w-full"style={{marginBottom:10, marginTop:10}}>
                <div className="relative w-full max-w-[400px]"> {/* Fixed width container */}
                  <img 
                    src="/RateX-Card.jpg" 
                    alt="RateX Card Example" 
                    className="w-full h-auto rounded-lg shadow-lg"
                    style={{ display: 'block', margin: '0 auto' }} 
                  />
                  {/* Highlights */}
                  <div className="highlight highlight-yield-exposure" />
                  <div className="highlight highlight-apy" />
                  <div className="highlight highlight-maturity" />
                </div>
              </div>
            </div>

            {/* Detailed Instructions */}
            <div className="space-y-12" style={{marginTop: 10}}>
              {/* Leverage Instructions */}
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/20 shadow-xl hover:border-lime-400/50 transition-all duration-300">
                <div className="flex items-start gap-3">
                  <div className="bg-gradient-to-br from-lime-500 to-green-600 p-2 rounded-lg flex-shrink-0" style={{margin:10}}>
                    <TrendingUp className="w-4 h-4 text-white" style={{margin:2}} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                      Leverage (Yield Exposure)
                      <span className="text-xs bg-lime-500/20 text-lime-300 px-2 py-0.5 rounded-full">Step 1</span>
                    </h3>
                    <p className="text-purple-200 text-sm" style={{lineHeight: 1.7, marginBottom: 10}}>
                      Enter the <span className="text-lime-400 font-semibold">Yield Exposure</span> value from your card. This shows your leveraged yield multiplier.
                    </p>
                  </div>
                </div>
              </div>

              {/* APY Instructions */}
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/20 shadow-xl hover:border-purple-400/50 transition-all duration-300" style={{marginTop: 10}}>
                <div className="flex items-start gap-3">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2 rounded-lg flex-shrink-0" style={{margin:10}}>
                    <Percent className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                      APY (Annual Percentage Yield)
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">Step 2</span>
                    </h3>
                    <p className="text-purple-200 text-sm" style={{lineHeight: 1.7, marginBottom: 12}}>
                      Use the <span className="text-purple-400 font-semibold">Underlying APY</span> shown at the bottom left (7-day average). Return depends on APY which can change for underlying asset.
                    </p>
                    <p className="text-purple-200/70 text-xs italic" style={{marginBottom: 10}}>
                      💡 You can also enter your own expected APY based on your predictions
                    </p>
                  </div>
                </div>
              </div>

              {/* Maturity Days Instructions */}
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/20 shadow-xl hover:border-blue-400/50 transition-all duration-300" style={{marginTop: 10}}>
                <div className="flex items-start gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-2 rounded-lg flex-shrink-0" style={{margin:10}}>
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                      Maturity Days
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">Step 3</span>
                    </h3>
                    <p className="text-purple-200 text-sm" style={{lineHeight: 1.7, marginBottom: 12}}>
                      Enter the number of days shown next to the <span className="text-blue-400 font-semibold">timer icon ⏱️</span> at the bottom right.
                    </p>
                    <p className="text-purple-200/70 text-xs italic" style={{marginBottom: 10}}>
                      💡 Enter <span className="text-blue-400 font-semibold">1</span> to calculate daily yield return
                    </p>
                  </div>
                </div>
              </div>

              {/* Yield Explanation */}
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-xl rounded-xl p-5 border border-amber-500/30 shadow-xl" style={{marginTop: 10}}>
                <div className="flex items-start gap-3">
                  <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-lg flex-shrink-0" style={{margin:10}}>
                    <Calculator className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold" style={{marginBottom: 0}}>Understanding Your Yield</h3>
                    <p className="text-purple-200 text-sm" style={{lineHeight: 1.7, marginBottom: 10}}>
                      Yield is returned in the <span className="text-amber-400 font-semibold">underlying asset</span> you're buying through (e.g., HyloSOL). For example, 80% recovered means you get back 80% of your HyloSOL Tokens. For 1 HyloSOL, It would be 0.8 HyloSOL.
                    </p>
                    <div className="bg-black/30 rounded-lg p-3 border border-amber-500/20">
                      <p className="text-xs text-amber-300 mb-2" style={{marginLeft: 8, marginTop: 3}}>Calculation Formula:</p>
                      <p className="text-white text-sm font-mono mb-2" style={{marginLeft: 8}}>
                        Yield Return = (Investment × Yield%) / 100
                      </p>
                      <p className="text-purple-200 text-xs" style={{marginLeft: 8, marginBottom: 3}}>
                        Example: 100 HyloSOL invested at 67.97% = <span className="text-green-400 font-semibold">67.97 HyloSOL recovered through yield</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="calculator-container">
            <div className="calculator-card">
              {/* Header */}
              <div className="card-header">
                <h1>Yield Calculator</h1>
                <p className="subtitle">Calculate your yield return</p>
                
                {/* Mode Toggle */}
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button
                    onClick={() => { 
                      setMode('manual'); 
                      setYieldReturn(null); 
                      setAvailableAssets([]);
                      setSelectedAsset('');
                      setAutoData(null);
                      setHasFetchedData(false);
                    }}
                    style={{
                      padding: '0.5rem 1.5rem',
                      borderRadius: '0.5rem',
                      border: mode === 'manual' ? '2px solid #a855f7' : '2px solid transparent',
                      background: mode === 'manual' 
                        ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' 
                        : 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: mode === 'manual' ? 'bold' : 'normal',
                      transition: 'all 0.3s ease',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    📝 Manual
                  </button>
                  <button
                    onClick={() => { 
                      setMode('auto'); 
                      setYieldReturn(null); 
                      setLeverage('');
                      setApy('');
                      setMaturityDays('');
                    }}
                    style={{
                      padding: '0.5rem 1.5rem',
                      borderRadius: '0.5rem',
                      border: mode === 'auto' ? '2px solid #a855f7' : '2px solid transparent',
                      background: mode === 'auto' 
                        ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' 
                        : 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: mode === 'auto' ? 'bold' : 'normal',
                      transition: 'all 0.3s ease',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <Zap className="w-4 h-4" style={{ display: 'inline', marginRight: '0.25rem' }} /> Auto
                  </button>
                </div>
              </div>

              {/* Form content */}
              <div className="card-content">
                {mode === 'manual' ? (
                  <>
                    {/* Manual Mode Inputs */}
                    <div className="input-group">
                      <label htmlFor="leverage">Leverage</label>
                      <input
                        id="leverage"
                        type="number"
                        step="0.01"
                        value={leverage}
                        onChange={(e) => setLeverage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter leverage"
                      />
                    </div>

                    <div className="input-group">
                      <label htmlFor="apy">APY (%)</label>
                      <input
                        id="apy"
                        type="number"
                        step="0.01"
                        value={apy}
                        onChange={(e) => setApy(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter APY percentage"
                      />
                    </div>

                    <div className="input-group">
                      <label htmlFor="maturityDays">Maturity Days</label>
                      <input
                        id="maturityDays"
                        type="number"
                        value={maturityDays}
                        onChange={(e) => setMaturityDays(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter maturity days"
                      />
                      <p className="input-hint" style={{opacity: 0.7, fontSize: '0.75rem', fontStyle: 'italic'}}>💡 Enter 1 to calculate daily yield return</p>
                    </div>

                    <button
                      onClick={calculateYieldReturn}
                      disabled={isCalculating}
                      className={`calculate-button ${isCalculating ? 'calculating' : ''}`}
                    >
                      {isCalculating ? (
                        <span className="loading-content">
                          <svg className="spinner" viewBox="0 0 24 24">
                            <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Calculating...
                        </span>
                      ) : (
                        'Calculate Yield Return'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Auto Mode */}
                    <div className="input-group">
                      <label htmlFor="asset-select">Select Asset</label>
                      <div ref={dropdownRef} style={{ position: 'relative' }}>
                        {/* Click area to open dropdown */}
                        <div
                          onClick={() => {
                            if (!hasFetchedData) {
                              alert('Please click "Fetch" button first to load assets from Rate-X');
                              return;
                            }
                            setIsDropdownOpen(!isDropdownOpen);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '2px solid rgba(168, 85, 247, 0.3)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: hasFetchedData ? 'white' : 'rgba(255, 255, 255, 0.5)',
                            fontSize: '1rem',
                            cursor: hasFetchedData ? 'pointer' : 'not-allowed',
                            backdropFilter: 'blur(10px)',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span>
                            {!hasFetchedData ? 'Click "Fetch" button first' : (selectedAsset || 'Select an asset')}
                          </span>
                          <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                            {hasFetchedData && (isDropdownOpen ? '▲' : '▼')}
                          </span>
                        </div>

                        {/* Dropdown */}
                        {isDropdownOpen && hasFetchedData && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '0.25rem',
                            background: 'rgba(30, 27, 75, 0.95)',
                            border: '2px solid rgba(168, 85, 247, 0.3)',
                            borderRadius: '0.5rem',
                            backdropFilter: 'blur(10px)',
                            zIndex: 1000,
                            overflow: 'hidden'
                          }}>
                            {/* Search input inside dropdown */}
                            <input
                              type="text"
                              placeholder="Type to filter..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: 'none',
                                borderBottom: '1px solid rgba(168, 85, 247, 0.3)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'white',
                                fontSize: '0.875rem',
                                outline: 'none'
                              }}
                            />
                            {/* Options list */}
                            <div style={{
                              maxHeight: '120px',
                              overflowY: 'auto',
                              overflowX: 'hidden',
                              paddingBottom: '0.5rem'
                            }}>
                              {availableAssets
                                .filter(asset => 
                                  asset.asset.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .map(asset => (
                                  <div
                                    key={asset.asset}
                                    onClick={() => {
                                      setSelectedAsset(asset.asset);
                                      setSearchTerm('');
                                      setIsDropdownOpen(false);
                                    }}
                                    style={{
                                      padding: '0.75rem',
                                      cursor: 'pointer',
                                      color: 'white',
                                      background: selectedAsset === asset.asset ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                                      transition: 'background 0.2s ease',
                                      marginBottom: '2px'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (selectedAsset !== asset.asset) {
                                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (selectedAsset !== asset.asset) {
                                        e.currentTarget.style.background = 'transparent';
                                      }
                                    }}
                                  >
                                    {asset.asset}
                                  </div>
                                ))}
                              {availableAssets.filter(asset => 
                                asset.asset.toLowerCase().includes(searchTerm.toLowerCase())
                              ).length === 0 && (
                                <div style={{ padding: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
                                  No assets found
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="input-hint" style={{opacity: 0.7, fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.5rem'}}>
                        💡 Fetch data first, then select asset. Click <Pencil className="w-3 h-3" style={{display: 'inline', marginBottom: '-2px'}} /> to edit values
                      </p>
                    </div>

                    {/* Display fetched data */}
                    {autoData && (
                      <div style={{
                        background: 'rgba(139, 92, 246, 0.1)',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        marginBottom: '1rem',
                        border: '1px solid rgba(139, 92, 246, 0.3)'
                      }}>
                        <h3 style={{ color: '#a855f7', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          Selected Asset: {autoData.asset}
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem', color: 'white' }}>
                          {/* Leverage */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <strong>Leverage:</strong>
                            {isEditingLeverage ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editableLeverage}
                                onChange={(e) => setEditableLeverage(e.target.value)}
                                onBlur={() => {
                                  setIsEditingLeverage(false);
                                  recalculateYield();
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    setIsEditingLeverage(false);
                                    recalculateYield();
                                  }
                                }}
                                style={{
                                  width: '60px',
                                  padding: '0.15rem 0.3rem',
                                  borderRadius: '0.25rem',
                                  border: '1px solid #10b981',
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  color: 'white',
                                  fontSize: '0.875rem',
                                  marginLeft: '0.25rem'
                                }}
                                autoFocus
                              />
                            ) : (
                              <span style={{ marginLeft: '0.25rem' }}>{editableLeverage || autoData.leverage}x</span>
                            )}
                            <button
                              onClick={() => setIsEditingLeverage(!isEditingLeverage)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.1rem',
                                color: isEditingLeverage ? '#10b981' : '#a855f7',
                                transition: 'color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                marginTop: '-2px'
                              }}
                              title="Edit value"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                          
                          {/* APY */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <strong>APY:</strong>
                            {isEditingApy ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editableApy}
                                onChange={(e) => setEditableApy(e.target.value)}
                                onBlur={() => {
                                  setIsEditingApy(false);
                                  recalculateYield();
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    setIsEditingApy(false);
                                    recalculateYield();
                                  }
                                }}
                                style={{
                                  width: '60px',
                                  padding: '0.15rem 0.3rem',
                                  borderRadius: '0.25rem',
                                  border: '1px solid #10b981',
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  color: 'white',
                                  fontSize: '0.875rem',
                                  marginLeft: '0.25rem'
                                }}
                                autoFocus
                              />
                            ) : (
                              <span style={{ marginLeft: '0.25rem' }}>{editableApy || autoData.apy}%</span>
                            )}
                            <button
                              onClick={() => setIsEditingApy(!isEditingApy)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.1rem',
                                color: isEditingApy ? '#10b981' : '#a855f7',
                                transition: 'color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                marginTop: '-2px'
                              }}
                              title="Edit value"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                          
                          {/* Maturity */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <strong>Maturity:</strong>
                            {isEditingMaturity ? (
                              <input
                                type="number"
                                step="1"
                                value={editableMaturity}
                                onChange={(e) => setEditableMaturity(e.target.value)}
                                onBlur={() => {
                                  setIsEditingMaturity(false);
                                  recalculateYield();
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    setIsEditingMaturity(false);
                                    recalculateYield();
                                  }
                                }}
                                style={{
                                  width: '50px',
                                  padding: '0.15rem 0.3rem',
                                  borderRadius: '0.25rem',
                                  border: '1px solid #10b981',
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  color: 'white',
                                  fontSize: '0.875rem',
                                  marginLeft: '0.25rem'
                                }}
                                autoFocus
                              />
                            ) : (
                              <span style={{ marginLeft: '0.25rem' }}>{editableMaturity || autoData.maturityDays} days</span>
                            )}
                            <button
                              onClick={() => setIsEditingMaturity(!isEditingMaturity)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.1rem',
                                color: isEditingMaturity ? '#10b981' : '#a855f7',
                                transition: 'color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                marginTop: '-2px'
                              }}
                              title="Edit value"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                          
                          {/* Asset Points */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <strong>Asset Points:</strong>
                            {isEditingAssetBoost ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editableAssetBoost}
                                onChange={(e) => setEditableAssetBoost(e.target.value)}
                                onBlur={() => setIsEditingAssetBoost(false)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    setIsEditingAssetBoost(false);
                                  }
                                }}
                                style={{
                                  width: '60px',
                                  padding: '0.15rem 0.3rem',
                                  borderRadius: '0.25rem',
                                  border: '1px solid #10b981',
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  color: 'white',
                                  fontSize: '0.875rem',
                                  marginLeft: '0.25rem'
                                }}
                                autoFocus
                              />
                            ) : (
                              <span style={{ marginLeft: '0.25rem' }}>{editableAssetBoost || autoData.assetBoost}x</span>
                            )}
                            <button
                              onClick={() => setIsEditingAssetBoost(!isEditingAssetBoost)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.1rem',
                                color: isEditingAssetBoost ? '#10b981' : '#a855f7',
                                transition: 'color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                marginTop: '-2px'
                              }}
                              title="Edit value"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                          
                          {/* RateX Points */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', gridColumn: '1 / -1' }}>
                            <strong>RateX Points:</strong>
                            {isEditingRatexBoost ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editableRatexBoost}
                                onChange={(e) => setEditableRatexBoost(e.target.value)}
                                onBlur={() => setIsEditingRatexBoost(false)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    setIsEditingRatexBoost(false);
                                  }
                                }}
                                style={{
                                  width: '60px',
                                  padding: '0.15rem 0.3rem',
                                  borderRadius: '0.25rem',
                                  border: '1px solid #10b981',
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  color: 'white',
                                  fontSize: '0.875rem',
                                  marginLeft: '0.25rem'
                                }}
                                autoFocus
                              />
                            ) : (
                              <span style={{ marginLeft: '0.25rem' }}>{editableRatexBoost || autoData.ratexBoost}x</span>
                            )}
                            <button
                              onClick={() => setIsEditingRatexBoost(!isEditingRatexBoost)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.1rem',
                                color: isEditingRatexBoost ? '#10b981' : '#a855f7',
                                transition: 'color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                marginTop: '-2px'
                              }}
                              title="Edit value"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {fetchError && (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        marginBottom: '1rem',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#fca5a5'
                      }}>
                        <strong>Error:</strong> {fetchError}
                      </div>
                    )}

                    {/* Fetch and Calculate Buttons - Side by Side */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                      {/* Fetch Button */}
                      <button
                        onClick={fetchAllAssetsHandler}
                        disabled={isFetchingAssets}
                        className={`calculate-button ${isFetchingAssets ? 'calculating' : ''}`}
                        style={{
                          flex: 1,
                          padding: '0.875rem 1.5rem',
                          fontSize: '1rem',
                          background: isFetchingAssets 
                            ? 'rgba(139, 92, 246, 0.5)' 
                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        }}
                      >
                        {isFetchingAssets ? (
                          <span className="loading-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RefreshCw className="w-4 h-4 animate-spin" style={{ marginRight: '0.5rem' }} />
                            Fetching...
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RefreshCw className="w-4 h-4" style={{ marginRight: '0.5rem' }} />
                            Fetch
                          </span>
                        )}
                      </button>

                      {/* Calculate Button */}
                      <button
                        onClick={calculateAutoYield}
                        disabled={isCalculating || !hasFetchedData || !selectedAsset}
                        className={`calculate-button ${isCalculating ? 'calculating' : ''}`}
                        style={{
                          flex: 1,
                          padding: '0.875rem 1.5rem',
                          fontSize: '1rem',
                          background: (!hasFetchedData || !selectedAsset)
                            ? 'rgba(139, 92, 246, 0.3)'
                            : isCalculating 
                              ? 'rgba(139, 92, 246, 0.5)' 
                              : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                          cursor: (!hasFetchedData || !selectedAsset) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isCalculating ? (
                          <span className="loading-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg className="spinner" viewBox="0 0 24 24" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}>
                              <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                              <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Calculating...
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Calculator className="w-4 h-4" style={{ marginRight: '0.5rem' }} />
                            Calculate
                          </span>
                        )}
                      </button>
                    </div>
                  </>
                )}

                {/* Result Display */}
                {yieldReturn !== null && (
                  <div ref={resultRef} className="result-container">
                    <div className="result-card">
                      <div className="grid grid-cols-2 gap-6">
                        {/* Gross Yield */}
                        <div className="text-center">
                          <p className="result-label mb-2">Gross Yield</p>
                          <p className="result-value gross-yield" 
                             style={{
                               background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
                               WebkitBackgroundClip: 'text',
                               WebkitTextFillColor: 'transparent',
                               backgroundClip: 'text',
                               fontWeight: '700',
                               textShadow: '0 0 1px rgba(124, 58, 237, 0.1)'
                             }}>
                            {yieldReturn.gross.toFixed(2)}%
                          </p>
                        </div>
                        {/* Net Yield */}
                        <div className="text-center">
                          <p className="result-label mb-2 flex items-center justify-center gap-2">
                            Net Yield
                            <div className="relative group">
                              <Info className="w-4 h-4 text-gray-400 cursor-help" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-6 py-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                &nbsp;&nbsp;0.5% of yield is taken as fees by RateX&nbsp;&nbsp;
                              </div>
                            </div>
                          </p>
                          <p className="result-value net-yield"
                             style={{
                               background: 'linear-gradient(to right, #f59e0b, #ef4444)',
                               WebkitBackgroundClip: 'text',
                               WebkitTextFillColor: 'transparent',
                               backgroundClip: 'text',
                               opacity: '0.85'
                             }}>
                            {yieldReturn.net.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer decoration */}
              <div className="card-footer"></div>
            </div>

            {/* Subtle glow effect */}
            <div className="glow-effect"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
