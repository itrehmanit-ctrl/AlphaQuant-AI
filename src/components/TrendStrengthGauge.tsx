import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  ChevronDown,
  Info,
  Sliders,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { SMADivergenceResult } from '../server/indicators.ts';

export interface MarketBreadthItem {
  symbol: string;
  price: number;
  change24hPercent: number;
  smaStatus: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

interface TrendStrengthGaugeProps {
  selectedSymbol: string;
  divergence: SMADivergenceResult;
  marketBreadth?: MarketBreadthItem[];
}

export const TrendStrengthGauge: React.FC<TrendStrengthGaugeProps> = ({
  selectedSymbol,
  divergence,
  marketBreadth = [],
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const {
    sentimentScore, // 0 - 100
    sentimentLabel,
    divergencePercent,
    fastSMA,
    slowSMA,
    fastPeriod,
    slowPeriod,
    momentumText,
  } = divergence;

  // Rotation for needle: 0 => -90 deg, 50 => 0 deg, 100 => +90 deg
  const needleRotation = -90 + (sentimentScore / 100) * 180;

  // Color scheme based on sentiment label
  const getColorClasses = () => {
    switch (sentimentLabel) {
      case 'STRONG_BULLISH':
        return {
          text: 'text-cyan-400',
          bg: 'bg-cyan-500/15',
          border: 'border-cyan-500/40',
          glow: 'glow-cyan',
          accent: '#06b6d4',
          label: 'STRONG BULLISH',
        };
      case 'BULLISH':
        return {
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/15',
          border: 'border-emerald-500/40',
          glow: 'glow-emerald',
          accent: '#10b981',
          label: 'BULLISH',
        };
      case 'STRONG_BEARISH':
        return {
          text: 'text-rose-500',
          bg: 'bg-rose-500/20',
          border: 'border-rose-500/50',
          glow: 'glow-rose',
          accent: '#ef4444',
          label: 'STRONG BEARISH',
        };
      case 'BEARISH':
        return {
          text: 'text-rose-400',
          bg: 'bg-rose-500/15',
          border: 'border-rose-500/40',
          glow: 'glow-rose',
          accent: '#f43f5e',
          label: 'BEARISH',
        };
      case 'NEUTRAL':
      default:
        return {
          text: 'text-amber-400',
          bg: 'bg-amber-500/15',
          border: 'border-amber-500/40',
          glow: '',
          accent: '#f59e0b',
          label: 'NEUTRAL',
        };
    }
  };

  const colors = getColorClasses();

  // Market Breadth Stats
  const bullishCount = marketBreadth.filter((b) => b.smaStatus === 'BULLISH').length;
  const totalCount = marketBreadth.length || 1;
  const bullishRatio = Math.round((bullishCount / totalCount) * 100);

  return (
    <div className="relative font-mono">
      {/* Compact Header Gauge Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-3 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-1.5 transition cursor-pointer ${
          colors.glow
        }`}
        title="Click to view full SMA Divergence & Market Breadth analytics"
      >
        {/* Semi-circular Mini Gauge Graphic */}
        <div className="relative w-12 h-7 flex items-end justify-center overflow-hidden shrink-0">
          <svg viewBox="0 0 100 55" className="w-full h-full">
            <defs>
              <linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="30%" stopColor="#f43f5e" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="70%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>

            {/* Background Arc */}
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke="#1e293b"
              strokeWidth="9"
              strokeLinecap="round"
            />

            {/* Colored Segment Arc */}
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke="url(#sentimentGradient)"
              strokeWidth="8"
              strokeLinecap="round"
            />

            {/* Center Pivot Point */}
            <circle cx="50" cy="50" r="4.5" fill="#e2e8f0" />

            {/* Animated Needle */}
            <g transform={`rotate(${needleRotation} 50 50)`} className="transition-transform duration-500 ease-out">
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="15"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>

        {/* Text Details in Header */}
        <div className="text-left leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">
              SMA Sentiment
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`text-[11px] font-extrabold px-1.5 py-0.2 rounded border ${colors.bg} ${colors.text} ${colors.border}`}
            >
              {colors.label}
            </span>
            <span className={`text-xs font-bold ${divergencePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {divergencePercent >= 0 ? '+' : ''}
              {divergencePercent}%
            </span>
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showDetails ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded Breakdown Modal / Dropdown Card */}
      {showDetails && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setShowDetails(false)}
          />

          <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 w-[350px] sm:w-[380px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-xs">
            {/* Modal Title */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">SMA Divergence Index</div>
                  <div className="text-[10px] text-slate-400">Moving Average Trend Gauge</div>
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                &times;
              </button>
            </div>

            {/* Large Visual Arc Meter in Popover */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-3 text-center">
              <div className="relative w-40 h-24 mx-auto flex items-end justify-center overflow-hidden">
                <svg viewBox="0 0 100 55" className="w-full h-full">
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="url(#sentimentGradient)"
                    strokeWidth="9"
                    strokeLinecap="round"
                  />
                  <circle cx="50" cy="50" r="5" fill="#f8fafc" />
                  <g
                    transform={`rotate(${needleRotation} 50 50)`}
                    className="transition-transform duration-700 ease-out"
                  >
                    <line
                      x1="50"
                      y1="50"
                      x2="50"
                      y2="14"
                      stroke="#ffffff"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </g>
                </svg>
              </div>

              {/* Meter Labels: Bearish / Neutral / Bullish */}
              <div className="flex justify-between text-[10px] text-slate-500 px-3 -mt-2">
                <span className="text-rose-400 font-bold">BEARISH</span>
                <span className="text-amber-400">NEUTRAL</span>
                <span className="text-emerald-400 font-bold">BULLISH</span>
              </div>

              <div className="mt-2.5">
                <span
                  className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
                >
                  {colors.label} (Score: {sentimentScore}/100)
                </span>
                <p className="text-[11px] text-slate-300 mt-1.5">{momentumText}</p>
              </div>
            </div>

            {/* Mathematical Divergence Stats */}
            <div className="space-y-2 mb-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center justify-between">
                <span>{selectedSymbol} SMA Metrics</span>
                <span className="text-[10px] text-slate-500">Fast({fastPeriod}) vs Slow({slowPeriod})</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">SMA ({fastPeriod}) Fast</div>
                  <div className="text-white font-bold mt-0.5">${fastSMA.toLocaleString()}</div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">SMA ({slowPeriod}) Slow</div>
                  <div className="text-white font-bold mt-0.5">${slowSMA.toLocaleString()}</div>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">SMA Divergence Spread:</span>
                <span className={`font-bold ${divergencePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {divergencePercent >= 0 ? '+' : ''}${Math.abs(fastSMA - slowSMA).toFixed(2)} ({divergencePercent >= 0 ? '+' : ''}
                  {divergencePercent}%)
                </span>
              </div>
            </div>

            {/* Market-Wide Breadth Spectrum */}
            {marketBreadth.length > 0 && (
              <div className="border-t border-slate-800 pt-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-2">
                  <span>Crypto Market Breadth</span>
                  <span className="text-emerald-400 font-bold">{bullishRatio}% Bullish</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
                  {marketBreadth.map((item) => (
                    <div
                      key={item.symbol}
                      className="flex items-center justify-between px-2 py-1 bg-slate-950 rounded border border-slate-850 text-[10px]"
                    >
                      <span className="font-semibold text-white">{item.symbol}</span>
                      <span
                        className={`font-bold ${
                          item.change24hPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.change24hPercent >= 0 ? '+' : ''}
                        {item.change24hPercent.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
