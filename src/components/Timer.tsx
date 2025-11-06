import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import './Dashboard.css';

interface TimerProps {
  maturesIn?: string | null;  // e.g., "23d 10h" from backend
  maturityDate?: string | null;  // e.g., "2025-11-29 00:00:00 UTC"
  maturityDays?: number | null;  // Fallback: number of days
}

// Parse "23d 10h" format from backend
const parseMaturesIn = (maturesIn: string): { days: number; hours: number } | null => {
  try {
    const match = maturesIn.match(/(\d+)d\s*(\d+)h/);
    if (match) {
      return {
        days: parseInt(match[1], 10),
        hours: parseInt(match[2], 10)
      };
    }
    return null;
  } catch {
    return null;
  }
};

// Calculate time remaining from maturity date
const calculateTimeRemaining = (maturityDate: string): { days: number; hours: number } | null => {
  try {
    const now = new Date();
    const maturity = new Date(maturityDate);
    const diffMs = maturity.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return { days: 0, hours: 0 };
    }
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return { days, hours };
  } catch {
    return null;
  }
};

const Timer: React.FC<TimerProps> = ({ maturesIn, maturityDate, maturityDays }) => {
  const [timeRemaining, setTimeRemaining] = useState<{ days: number; hours: number } | null>(null);

  useEffect(() => {
    // Priority 1: Use maturesIn from backend (already formatted)
    if (maturesIn) {
      const parsed = parseMaturesIn(maturesIn);
      if (parsed) {
        setTimeRemaining(parsed);
        return;
      }
    }

    // Priority 2: Calculate from maturityDate
    if (maturityDate) {
      const calculated = calculateTimeRemaining(maturityDate);
      if (calculated) {
        setTimeRemaining(calculated);
        
        // Update every hour for live countdown
        const interval = setInterval(() => {
          const updated = calculateTimeRemaining(maturityDate);
          if (updated) {
            setTimeRemaining(updated);
          }
        }, 3600000); // Update every hour
        
        return () => clearInterval(interval);
      }
    }

    // Priority 3: Use maturityDays as fallback (static)
    if (maturityDays && maturityDays > 0) {
      setTimeRemaining({ days: maturityDays, hours: 0 });
    }
  }, [maturesIn, maturityDate, maturityDays]);

  if (!timeRemaining) {
    return null;
  }

  return (
    <div className="timer-pill">
      <Clock className="timer-icon" size={16} />
      <span className="timer-text">
        {timeRemaining.days}d {timeRemaining.hours}h
      </span>
    </div>
  );
};

export default Timer;
