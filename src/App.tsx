import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import StrategyDashboard from './pages/StrategyDashboard';
import YieldCalculator from './pages/YieldCalculator';
import './App.css';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<StrategyDashboard />} />
        <Route path="/calculator" element={<YieldCalculator />} />
      </Routes>
    </>
  );
}

export default App;
