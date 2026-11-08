import React, { useState } from 'react';
import {
  Sparkles,
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  ExternalLink,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { AISignalResult } from '../server/geminiAnalyst.ts';

interface AIPanelProps {
  symbol: string;
  currentPrice: number;
  onPopulateTrade: (tradeParams: {
    symbol: string;
    side: 'BUY' | 'SELL';
    stopLossPrice: number;
    takeProfitPrice?: number;
    suggestedRiskPct: number;
  }) => void;
  signalResult: AISignalResult | null;
  loadingSignal: boolean;
  onRunAnalysis: () => void;
  macroData: {
    summary: string;
    sources: { title: string; uri: string }[];
  } | null;
  loadingMacro: boolean;
  onRefreshMacro: () => void;
}

export const AIPanel: React.FC<AIPanelProps> = ({
  symbol,
  currentPrice,
  onPopulateTrade,
  signalResult,
  loadingSignal,
  onRunAnalysis,
  macroData,
  loadingMacro,
  onRefreshMacro,
}) => {
  const [activeTab, setActiveTab] = useState<'1D_SIGNAL' | 'MACRO_SEARCH'>('1D_SIGNAL');

  const getSignalBadge = (sig: 'BUY' | 'SELL' | 'HOLD') => {
    if (sig === 'BUY') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono font-bold text-sm glow-emerald">
          <TrendingUp className="w-4 h-4" /> LONG / BUY
        </span>
      );
    }
    if (sig === 'SELL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 font-mono font-bold text-sm glow-rose">
          <TrendingDown className="w-4 h-4" /> SHORT / SELL
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold text-sm">
        <MinusCircle className="w-4 h-4" /> NEUTRAL / HOLD
      </span>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      {/* Header Tabs */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('1D_SIGNAL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
              activeTab === '1D_SIGNAL'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>1-Day Trend Forecast</span>
            <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1 py-0.2 rounded font-mono">
              HIGH THINKING
            </span>
          </button>

          <button
            onClick={() => setActiveTab('MACRO_SEARCH')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
              activeTab === 'MACRO_SEARCH'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Grounding</span>
          </button>
        </div>

        {activeTab === '1D_SIGNAL' ? (
          <button
            onClick={onRunAnalysis}
            disabled={loadingSignal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg text-xs font-mono font-bold transition shadow-md shadow-emerald-950 cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${loadingSignal ? 'animate-spin' : ''}`} />
            <span>{loadingSignal ? 'Analyzing with High Thinking...' : 'Analyze 1D Signal'}</span>
          </button>
        ) : (
          <button
            onClick={onRefreshMacro}
            disabled={loadingMacro}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition"
          >
            <Search className={`w-3.5 h-3.5 ${loadingMacro ? 'animate-spin' : ''}`} />
            <span>{loadingMacro ? 'Searching...' : 'Refresh Macro'}</span>
          </button>
        )}
      </div>

      {/* Tab 1: 1-Day Deep Quantitative Forecast */}
      {activeTab === '1D_SIGNAL' && (
        <div className="p-4 space-y-4">
          {loadingSignal ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                <BrainCircuit className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto" />
              </div>
              <div className="text-center font-mono">
                <p className="text-sm font-bold text-white">Gemini High Thinking in Progress...</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Computing 1-Day exponential moving average ribbons, RSI divergence, MACD volume clusters, and ATR volatility targets for {symbol}.
                </p>
              </div>
            </div>
          ) : signalResult ? (
            <div className="space-y-4">
              {/* Primary Signal Ribbon */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    1-Day Trend Recommendation
                  </div>
                  <div className="flex items-center gap-3">
                    {getSignalBadge(signalResult.signal)}
                    <span className="font-mono text-xs text-slate-400">
                      Market Regime:{' '}
                      <strong className="text-white">{signalResult.marketRegime}</strong>
                    </span>
                  </div>
                </div>

                {/* Confidence Meter */}
                <div className="flex items-center gap-3 font-mono">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">Model Confidence</div>
                    <div className="text-lg font-bold text-emerald-400">
                      {signalResult.confidence}%
                    </div>
                  </div>
                  <div className="w-16 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
                      style={{ width: `${signalResult.confidence}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Price Targets & Risk Management Matrix */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
                  <div className="text-slate-400 text-[10px] uppercase">Mark Price</div>
                  <div className="text-white font-bold text-sm mt-0.5">
                    ${signalResult.currentPrice.toLocaleString()}
                  </div>
                </div>

                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-3">
                  <div className="text-emerald-400 text-[10px] uppercase font-bold flex items-center justify-between">
                    <span>Target Price (TP)</span>
                    <TrendingUp className="w-3 h-3" />
                  </div>
                  <div className="text-emerald-300 font-bold text-sm mt-0.5">
                    ${signalResult.targetPrice.toLocaleString()}
                  </div>
                </div>

                <div className="bg-rose-950/20 border border-rose-500/30 rounded-lg p-3">
                  <div className="text-rose-400 text-[10px] uppercase font-bold flex items-center justify-between">
                    <span>Hard Stop-Loss (SL)</span>
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                  <div className="text-rose-300 font-bold text-sm mt-0.5">
                    ${signalResult.stopLossPrice.toLocaleString()}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
                  <div className="text-slate-400 text-[10px] uppercase">Risk : Reward</div>
                  <div className="text-cyan-400 font-bold text-sm mt-0.5">
                    {signalResult.riskRewardRatio} : 1
                  </div>
                </div>
              </div>

              {/* Key Drivers */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-3">
                <div className="text-xs font-mono font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quantitative Signal Drivers</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {signalResult.keyDrivers.map((driver, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/90 border border-slate-800 rounded px-2.5 py-1.5 text-[11px] font-mono text-slate-300 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{driver}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deep Reasoning Text */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5 font-mono">
                <div className="text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Mathematical & Market Structure Rationale</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Model: {signalResult.modelUsed}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {signalResult.reason}
                </p>
              </div>

              {/* Action: Auto-Populate Trade Ticket */}
              {signalResult.signal !== 'HOLD' && (
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
                  <div className="text-xs font-mono">
                    <span className="font-bold text-emerald-400">Risk Rule Verified:</span>
                    <span className="text-slate-300 ml-1.5">
                      Recommended risk: {signalResult.recommendedPositionSizePct}% of equity (Hard Capped &le; 2.0%).
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      onPopulateTrade({
                        symbol: signalResult.symbol,
                        side: signalResult.signal as 'BUY' | 'SELL',
                        stopLossPrice: signalResult.stopLossPrice,
                        takeProfitPrice: signalResult.targetPrice,
                        suggestedRiskPct: signalResult.recommendedPositionSizePct,
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-mono font-bold transition shadow cursor-pointer"
                  >
                    <span>Apply Signal to Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-10 text-center font-mono">
              <BrainCircuit className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                Ready for 1-Day Trend Prediction
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Gemini high thinking mode evaluates 60 daily candles, moving average stack, and volatility bands to output institutional grade signals.
              </p>
              <button
                onClick={onRunAnalysis}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold transition inline-flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run 1D Gemini Analysis</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Google Search Grounding for Macro Catalysts */}
      {activeTab === 'MACRO_SEARCH' && (
        <div className="p-4 space-y-4">
          {loadingMacro ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
              <p className="text-xs font-mono text-slate-400">
                Searching real-time web for {symbol} catalysts & macro flows...
              </p>
            </div>
          ) : macroData ? (
            <div className="space-y-3 font-mono">
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5">
                <div className="text-xs font-bold text-cyan-400 mb-2 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  <span>Real-Time Macro Grounding Summary</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {macroData.summary}
                </p>
              </div>

              {/* Grounding Source Citations */}
              {macroData.sources && macroData.sources.length > 0 && (
                <div className="border border-slate-800/80 rounded-lg p-3 bg-slate-950/40">
                  <div className="text-[11px] text-slate-400 font-semibold mb-2">
                    Verified Google Search Grounding Sources:
                  </div>
                  <div className="space-y-1.5">
                    {macroData.sources.map((source, i) => (
                      <a
                        key={i}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 text-[11px] text-cyan-400 transition"
                      >
                        <span className="truncate max-w-[85%]">{source.title}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center font-mono">
              <p className="text-xs text-slate-400">Click below to ground analysis in current macro news & ETF flows.</p>
              <button
                onClick={onRefreshMacro}
                className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-mono"
              >
                Fetch Search Grounding
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
