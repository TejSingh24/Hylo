import { useState } from 'react'
import './App.css'
import './components/CardHighlights.css'
import { Info, TrendingUp, Clock, Percent, Calculator } from 'lucide-react';

function App() {
  const [leverage, setLeverage] = useState('')
  const [apy, setApy] = useState('')
  const [maturityDays, setMaturityDays] = useState('')
  const [yieldReturn, setYieldReturn] = useState<number | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const calculateYieldReturn = () => {
    setIsCalculating(true)

    setTimeout(() => {
      const leverageNum = parseFloat(leverage)
      const apyNum = parseFloat(apy) / 100 // Converting percentage to decimal
      const maturityDaysNum = parseFloat(maturityDays)

      if (isNaN(leverageNum) || isNaN(apyNum) || isNaN(maturityDaysNum)) {
        alert('Please enter valid numbers')
        setIsCalculating(false)
        return
      }

      const result = leverageNum * (Math.pow(1 + apyNum, 1 / 365) - 1) * 365 * (maturityDaysNum / 365)
      setYieldReturn(result * 100) // Converting to percentage
      setIsCalculating(false)
    }, 300)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      calculateYieldReturn()
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
                <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-2 rounded-lg" style={{margin:3}}>
                  <Info className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Hylo Asset Yield Calculator for Rate-X</h2>
              </div>
              <p className="text-purple-200 text-sm" style={{marginLeft: 35, marginTop: 8, marginBottom: 10, lineHeight: 1.7}}>
                Find the values from your Hylo asset card and enter them below. The highlighted areas show exactly where each value is located.
              </p>
            </div>

            {/* Screenshot with Annotations */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl mb-16" style={{marginBottom:0,}}>
              <h3 className="text-white font-semibold mb-4 text-center">Reference Card Example</h3>

              {/* Card Screenshot Container */}
              <div className="card-screenshot-container">
                <img src="/RateX-Card.jpg" alt="RateX Card Example" className="w-full max-w-sm rounded-lg shadow-lg" />
                {/* Highlights */}
                <div className="highlight highlight-yield-exposure" />
                <div className="highlight highlight-apy" />
                <div className="highlight highlight-maturity" />
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
              </div>

              {/* Form content */}
              <div className="card-content">
                {/* Leverage Input */}
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

                {/* APY Input */}
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

                {/* Maturity Days Input */}
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

                {/* Calculate Button */}
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

                {/* Result Display */}
                {yieldReturn !== null && (
                  <div className="result-container">
                    <div className="result-card">
                      <p className="result-label">Yield Return</p>
                      <p className="result-value">{yieldReturn.toFixed(2)}%</p>
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
