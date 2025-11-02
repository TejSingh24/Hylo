import { useState } from 'react'
import './App.css'
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
          <div className="space-y-8 max-w-2xl">
            {/* Header Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-2 rounded-lg">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">How to Use This Calculator</h2>
              </div>
              <p className="text-purple-200 text-sm leading-relaxed">
                Find the values from your Hylo asset card and enter them below. The highlighted areas show exactly where each value is located.
              </p>
            </div>

            {/* Screenshot with Annotations */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl">
              <h3 className="text-white font-semibold mb-4 text-center">Reference Card Example</h3>

              {/* Card Screenshot Container */}
              <div className="flex justify-center py-4">
                <div className="relative bg-[#141517] rounded-2xl p-5 border border-zinc-800/50 shadow-2xl w-full max-w-[550px] min-w-[320px] aspect-[595/150]">
                  {/* Recreated Card */}
                  <div className="space-y-3">
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-[#7E3BDC] rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="20" cy="20" r="20" fill="currentColor"/>
                            <path fillRule="evenodd" clipRule="evenodd" d="M20 0C31.0457 0 40 8.9543 40 20C40 31.0457 31.0457 40 20 40C8.9543 40 0 31.0457 0 20C0 8.9543 8.9543 0 20 0ZM21.6326 15.6522C21.6326 14.7348 20.8935 13.9928 19.9797 13.9928C19.0659 13.9928 18.3269 14.7348 18.3269 15.6522V18.3116H15.6731C14.7593 18.3116 14.0203 19.0536 14.0203 19.971C14.0203 20.8884 14.7593 21.6304 15.6731 21.6304H18.3269V24.2899C18.3269 25.2072 19.0659 25.9493 19.9797 25.9493C20.8935 25.9493 21.6326 25.2072 21.6326 24.2899V21.6304H24.2864C25.2002 21.6304 25.9392 20.8884 25.9392 19.971C25.9392 19.0536 25.2002 18.3116 24.2864 18.3116H21.6326V15.6522Z" fill="white"/>
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-white font-medium text-[15px] tracking-wide">hyloSOL-2541</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border border-gray-600 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">ⓘ</span>
                        </div>
                        <span className="text-amber-400 text-lg">⭐</span>
                      </div>
                    </div>

                    {/* Leverage Tags */}
                    <div className="flex gap-2.5 text-sm mb-3">
                      <span className="text-[#4AE14D] flex items-center gap-1 font-medium">
                        <span>⚡</span> 2x
                      </span>
                      <span className="text-white/90 flex items-center gap-1 font-medium">
                        <span>⊗</span> 5x
                      </span>
                    </div>

                    {/* Main Values */}
                    <div className="grid grid-cols-2 gap-6 mb-3">
                      {/* Yield Exposure - Highlighted */}
                      <div className="relative">
                        <div className="absolute -inset-2 bg-[#4AE14D]/20 rounded-lg border-2 border-[#4AE14D] animate-pulse"></div>
                        <div className="relative">
                          <p className="text-gray-500 text-xs mb-1 font-normal">Yield Exposure</p>
                          <p className="text-[#4AE14D] text-[32px] font-bold leading-none tracking-tight">125.94x</p>
                        </div>
                        {/* Annotation Arrow */}
                        <div className="absolute -right-4 lg:-right-16 top-1/2 -translate-y-1/2 hidden lg:block">
                          <div className="flex items-center gap-2">
                            <div className="w-8 lg:w-12 h-0.5 bg-[#4AE14D]"></div>
                            <div className="bg-[#4AE14D] text-black text-xs px-2 py-1 rounded whitespace-nowrap font-semibold">
                              Step 1
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Implied Yield */}
                      <div className="relative">
                        <p className="text-gray-500 text-xs mb-1 font-normal">Implied Yield</p>
                        <p className="text-[#4AE14D] text-[32px] font-bold leading-none tracking-tight mb-1">11.596%</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[#4AE14D] text-xs font-medium">+1.66%</span>
                          <div className="flex-1 h-0.5 bg-[#4AE14D]/30 rounded-full overflow-hidden">
                            <div className="h-full w-2/3 bg-[#4AE14D] rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="flex justify-between items-center pt-3 border-t border-zinc-800/50">
                      {/* Underlying APY - Highlighted */}
                      <div className="relative">
                        <div className="absolute -inset-2 bg-purple-500/20 rounded-lg border-2 border-purple-400 animate-pulse"></div>
                        <div className="relative">
                          <p className="text-gray-500 text-xs font-normal flex items-center gap-1">
                            Underlying APY <span className="text-white font-medium">8.10%</span>
                          </p>
                        </div>
                        {/* Annotation Arrow */}
                        <div className="absolute -right-4 lg:-right-16 top-1/2 -translate-y-1/2 hidden lg:block">
                          <div className="flex items-center gap-2">
                            <div className="w-8 lg:w-12 h-0.5 bg-purple-400"></div>
                            <div className="bg-purple-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap font-semibold">
                              Step 2
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Maturity Days - Highlighted */}
                      <div className="relative">
                        <div className="absolute -inset-2 bg-blue-500/20 rounded-lg border-2 border-blue-400 animate-pulse"></div>
                        <div className="relative">
                          <p className="text-gray-500 text-xs flex items-center gap-1.5 font-normal">
                            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="text-white font-medium">26 Days</span>
                          </p>
                        </div>
                        {/* Annotation Arrow */}
                        <div className="absolute -right-4 lg:-right-16 top-1/2 -translate-y-1/2 hidden lg:block">
                          <div className="flex items-center gap-2">
                            <div className="w-8 lg:w-12 h-0.5 bg-blue-400"></div>
                            <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap font-semibold">
                              Step 3
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom accent */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-lime-500 via-purple-500 to-blue-500"></div>
                </div>
              </div>
            </div>

            {/* Detailed Instructions */}
            <div className="space-y-4">
              {/* Leverage Instructions */}
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/20 shadow-xl hover:border-lime-400/50 transition-all duration-300">
                <div className="flex items-start gap-3">
                  <div className="bg-gradient-to-br from-lime-500 to-green-600 p-2 rounded-lg flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                      Leverage (Yield Exposure)
                      <span className="text-xs bg-lime-500/20 text-lime-300 px-2 py-0.5 rounded-full">Step 1</span>
                    </h3>
                    <p className="text-purple-200 text-sm leading-relaxed">
                      Enter the <span className="text-lime-400 font-semibold">Yield Exposure</span> value from your card. This shows your leveraged yield multiplier.
                    </p>
                  </div>
                </div>
              </div>

              {/* APY Instructions */}
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/20 shadow-xl hover:border-purple-400/50 transition-all duration-300">
                <div className="flex items-start gap-3">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2 rounded-lg flex-shrink-0">
                    <Percent className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                      APY (Annual Percentage Yield)
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">Step 2</span>
                    </h3>
                    <p className="text-purple-200 text-sm leading-relaxed mb-2">
                      Use the <span className="text-purple-400 font-semibold">Underlying APY</span> shown at the bottom left (7-day average).
                    </p>
                    <p className="text-purple-200/70 text-xs italic">
                      💡 You can also enter your own expected APY based on your predictions
                    </p>
                  </div>
                </div>
              </div>

              {/* Maturity Days Instructions */}
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/20 shadow-xl hover:border-blue-400/50 transition-all duration-300">
                <div className="flex items-start gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-2 rounded-lg flex-shrink-0">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                      Maturity Days
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">Step 3</span>
                    </h3>
                    <p className="text-purple-200 text-sm leading-relaxed mb-2">
                      Enter the number of days shown next to the <span className="text-blue-400 font-semibold">timer icon ⏱️</span> at the bottom right.
                    </p>
                    <p className="text-purple-200/70 text-xs italic">
                      💡 Enter <span className="text-blue-400 font-semibold">1</span> to calculate daily yield return
                    </p>
                  </div>
                </div>
              </div>

              {/* Yield Explanation */}
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-xl rounded-xl p-5 border border-amber-500/30 shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-lg flex-shrink-0">
                    <Calculator className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2">Understanding Your Yield</h3>
                    <p className="text-purple-200 text-sm leading-relaxed mb-3">
                      Yield is returned in the <span className="text-amber-400 font-semibold">underlying asset</span> you're buying through (e.g., HyloSOL). For example, 80% HyloSOL recovered means you get back 80% of your principal.
                    </p>
                    <div className="bg-black/30 rounded-lg p-3 border border-amber-500/20">
                      <p className="text-xs text-amber-300 mb-2">Calculation Formula:</p>
                      <p className="text-white text-sm font-mono mb-2">
                        Yield Return = (Investment × Yield%) / 100
                      </p>
                      <p className="text-purple-200 text-xs">
                        Example: $100 invested at 67.97% = <span className="text-green-400 font-semibold">$67.97 recovered</span>
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
                <h1>Recovery Calculator</h1>
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
                  <p className="input-hint">* Enter 1 to calculate daily return</p>
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
