import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Layers,
  PieChart,
  Grid,
  ListFilter,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import { Position } from '../server/paperEngine.ts';

interface RiskHeatmapProps {
  positions: Position[];
  equityUSDT: number;
  balanceUSDT: number;
  onClosePosition: (positionId: string, partialRatio: number) => Promise<void>;
  onSelectSymbol?: (symbol: string) => void;
}

export const RiskHeatmap: React.FC<RiskHeatmapProps> = ({
  positions,
  equityUSDT,
  balanceUSDT,
  onClosePosition,
  onSelectSymbol,
}) => {
  const [viewMode, setViewMode] = useState<'TILES' | 'TABLE'>('TILES');
  const [showDemoScenario, setShowDemoScenario] = useState<boolean>(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  // Demo positions for preview if user hasn't opened any trades yet
  const demoPositions: Position[] = [
    {
      id: 'demo-btc',
      symbol: 'BTCUSDT',
      side: 'BUY',
      entryPrice: 90200,
      currentPrice: 91450,
      quantity: 0.35,
      notionalValue: 32007.5,
      stopLossPrice: 88800,
      takeProfitPrice: 94500,
      unrealizedPnL: 437.5,
      unrealizedPnLPercent: 1.39,
      openedAt: Date.now() - 3600000 * 5,
      signalSource: 'GEMINI_1D',
    },
    {
      id: 'demo-eth',
      symbol: 'ETHUSDT',
      side: 'BUY',
      entryPrice: 3380,
      currentPrice: 3420,
      quantity: 4.5,
      notionalValue: 15390,
      stopLossPrice: 3260,
      takeProfitPrice: 3650,
      unrealizedPnL: 180,
      unrealizedPnLPercent: 1.18,
      openedAt: Date.now() - 3600000 * 8,
      signalSource: 'GEMINI_1D',
    },
    {
      id: 'demo-sol',
      symbol: 'SOLUSDT',
      side: 'SELL',
      entryPrice: 220,
      currentPrice: 215.8,
      quantity: 45,
      notionalValue: 9711,
      stopLossPrice: 228,
      takeProfitPrice: 198,
      unrealizedPnL: 189,
      unrealizedPnLPercent: 1.91,
      openedAt: Date.now() - 3600000 * 2,
      signalSource: 'HFT_FAST',
    },
    {
      id: 'demo-doge',
      symbol: 'DOGEUSDT',
      side: 'BUY',
      entryPrice: 0.295,
      currentPrice: 0.285,
      quantity: 15000,
      notionalValue: 4275,
      stopLossPrice: 0.272,
      takeProfitPrice: 0.33,
      unrealizedPnL: -150,
      unrealizedPnLPercent: -3.39,
      openedAt: Date.now() - 3600000 * 12,
      signalSource: 'STRATEGY_EMA',
    },
  ];

  // Use actual positions if available, or allow demo toggling if 0 positions
  const isUsingDemo = positions.length === 0 && showDemoScenario;
  const activePositions = positions.length > 0 ? positions : isUsingDemo ? demoPositions : [];

  // Calculate Portfolio Risk & Exposure Metrics
  const totalNotionalExposure = activePositions.reduce((acc, p) => acc + p.notionalValue, 0);
  const exposurePctOfEquity = equityUSDT > 0 ? (totalNotionalExposure / equityUSDT) * 100 : 0;
  const freeMarginUSDT = Math.max(0, equityUSDT - totalNotionalExposure);
  const freeMarginPct = equityUSDT > 0 ? (freeMarginUSDT / equityUSDT) * 100 : 100;

  // Calculate Value at Risk (VaR) based on Hard Stop-Loss distances
  const assetRisks = activePositions.map((pos) => {
    const slDist = Math.abs(pos.currentPrice - pos.stopLossPrice);
    const riskUSDT = pos.quantity * slDist;
    const riskPctEquity = equityUSDT > 0 ? (riskUSDT / equityUSDT) * 100 : 0;
    const exposurePct = equityUSDT > 0 ? (pos.notionalValue / equityUSDT) * 100 : 0;
    const slDistPct = pos.currentPrice > 0 ? (slDist / pos.currentPrice) * 100 : 0;

    // Concentration & Risk Level categorization
    let riskLevel: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'SAFE';
    if (riskPctEquity > 2.0 || exposurePct > 35) {
      riskLevel = 'CRITICAL';
    } else if (riskPctEquity > 1.5 || exposurePct > 25) {
      riskLevel = 'HIGH';
    } else if (riskPctEquity > 1.0 || exposurePct > 15) {
      riskLevel = 'MODERATE';
    }

    return {
      ...pos,
      riskUSDT,
      riskPctEquity,
      exposurePct,
      slDistPct,
      riskLevel,
    };
  });

  const totalVaRUSDT = assetRisks.reduce((acc, a) => acc + a.riskUSDT, 0);
  const totalVaRPct = equityUSDT > 0 ? (totalVaRUSDT / equityUSDT) * 100 : 0;

  // Find most concentrated asset
  const maxExposedAsset = [...assetRisks].sort((a, b) => b.exposurePct - a.exposurePct)[0];
  const hasCriticalConcentration = assetRisks.some((a) => a.riskLevel === 'CRITICAL');
  const hasHighConcentration = assetRisks.some((a) => a.riskLevel === 'HIGH');

  // Herfindahl-Hirschman Concentration Index (HHI)
  // Sum of squares of market shares: < 1500 is diversified, 1500-2500 moderate, > 2500 concentrated
  let hhi = 0;
  if (totalNotionalExposure > 0) {
    hhi = assetRisks.reduce((acc, a) => {
      const share = (a.notionalValue / totalNotionalExposure) * 100;
      return acc + share * share;
    }, 0);
  }

  const getDiversificationScore = () => {
    if (activePositions.length === 0) return { score: 100, label: '100% Cash / Zero Exposure', color: 'text-emerald-400' };
    if (hhi > 3500) return { score: 48, label: 'High Concentration Risk', color: 'text-rose-400' };
    if (hhi > 2200) return { score: 68, label: 'Moderate Concentration', color: 'text-amber-400' };
    return { score: 92, label: 'Well Diversified', color: 'text-emerald-400' };
  };

  const divScore = getDiversificationScore();

  const handleDeRisk = async (id: string) => {
    if (isUsingDemo) return;
    try {
      setClosingId(id);
      await onClosePosition(id, 0.5);
    } finally {
      setClosingId(null);
    }
  };

  const getHeatmapColor = (level: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL') => {
    switch (level) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-950/40 hover:bg-rose-900/50',
          border: 'border-rose-500/60',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          indicator: 'bg-rose-500',
          glow: 'glow-rose animate-pulse',
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-950/30 hover:bg-orange-900/40',
          border: 'border-orange-500/50',
          badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
          indicator: 'bg-orange-500',
          glow: '',
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-950/20 hover:bg-amber-900/30',
          border: 'border-amber-500/40',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          indicator: 'bg-amber-400',
          glow: '',
        };
      case 'SAFE':
      default:
        return {
          bg: 'bg-emerald-950/20 hover:bg-emerald-900/30',
          border: 'border-emerald-500/40',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          indicator: 'bg-emerald-400',
          glow: 'glow-emerald',
        };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs flex flex-col">
      {/* Header bar */}
      <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500/20 to-rose-500/20 border border-amber-500/40 flex items-center justify-center">
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Portfolio Risk & Exposure Heatmap</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
                VaR Matrix
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Real-time asset exposure and stop-loss capital at risk
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-3">
          {/* Demo Scenario preview toggle if 0 active positions */}
          {positions.length === 0 && (
            <button
              onClick={() => setShowDemoScenario(!showDemoScenario)}
              className={`px-2.5 py-1 rounded text-[11px] border transition cursor-pointer flex items-center gap-1.5 ${
                showDemoScenario
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
              <span>{showDemoScenario ? 'Hide Scenario Demo' : 'Simulate Portfolio Exposure'}</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('TILES')}
              className={`p-1.5 rounded transition cursor-pointer ${
                viewMode === 'TILES'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Tile Matrix View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded transition cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Detailed Table View"
            >
              <ListFilter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* High-Level Risk & Concentration Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-3 bg-slate-950/40 border-b border-slate-800/80">
        {/* Metric 1: Total Portfolio VaR */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
          <div className="text-slate-400 text-[10px] uppercase flex items-center justify-between">
            <span>Total Capital at Risk (VaR)</span>
            <ShieldAlert className="w-3 h-3 text-rose-400" />
          </div>
          <div className="text-white font-bold text-sm mt-0.5">
            ${totalVaRUSDT.toFixed(2)}{' '}
            <span
              className={`text-[11px] font-normal ${
                totalVaRPct > 4 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              ({totalVaRPct.toFixed(2)}% Equity)
            </span>
          </div>
        </div>

        {/* Metric 2: Gross Notional Exposure */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
          <div className="text-slate-400 text-[10px] uppercase flex items-center justify-between">
            <span>Gross Market Exposure</span>
            <Layers className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="text-white font-bold text-sm mt-0.5">
            ${totalNotionalExposure.toFixed(2)}{' '}
            <span className="text-[11px] font-normal text-cyan-400">
              ({exposurePctOfEquity.toFixed(1)}% of Equity)
            </span>
          </div>
        </div>

        {/* Metric 3: Max Single Asset Exposure */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
          <div className="text-slate-400 text-[10px] uppercase flex items-center justify-between">
            <span>Max Single Exposure</span>
            <PieChart className="w-3 h-3 text-amber-400" />
          </div>
          <div className="text-white font-bold text-sm mt-0.5">
            {maxExposedAsset ? (
              <>
                {maxExposedAsset.symbol}:{' '}
                <span
                  className={
                    maxExposedAsset.exposurePct > 30 ? 'text-rose-400' : 'text-amber-400'
                  }
                >
                  {maxExposedAsset.exposurePct.toFixed(1)}%
                </span>
              </>
            ) : (
              'None (100% Cash)'
            )}
          </div>
        </div>

        {/* Metric 4: Diversification Health Index */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
          <div className="text-slate-400 text-[10px] uppercase flex items-center justify-between">
            <span>Concentration Health</span>
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
          </div>
          <div className={`font-bold text-sm mt-0.5 ${divScore.color}`}>
            {divScore.score}/100{' '}
            <span className="text-[10px] text-slate-400 font-normal">
              ({divScore.label})
            </span>
          </div>
        </div>
      </div>

      {/* Concentration Warning Alerts Banner */}
      {(hasCriticalConcentration || hasHighConcentration) && (
        <div className="mx-3 mt-3 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
            <span>
              <strong>OVER-CONCENTRATION DETECTED:</strong>{' '}
              {maxExposedAsset?.symbol} exceeds the 25% single-asset risk allocation guideline.
            </span>
          </div>
          <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
            Rebalance Recommended
          </span>
        </div>
      )}

      {/* Heatmap Main Content */}
      <div className="p-3">
        {activePositions.length === 0 ? (
          <div className="py-10 text-center text-slate-500 flex flex-col items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-emerald-500/40 mb-2" />
            <p className="font-semibold text-slate-300">Zero Active Market Exposure</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Your capital is 100% preserved in USDT. When you execute trades or apply Gemini 1-Day signals, this matrix will dynamically map portfolio risk density.
            </p>
            <button
              onClick={() => setShowDemoScenario(true)}
              className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Portfolio Exposure Heatmap</span>
            </button>
          </div>
        ) : viewMode === 'TILES' ? (
          /* Color-Coded Heatmap Tiles Matrix */
          <div className="space-y-3">
            {isUsingDemo && (
              <div className="text-[11px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded-lg flex items-center justify-between">
                <span>Displaying Simulated Multi-Asset Exposure Scenario</span>
                <button
                  onClick={() => setShowDemoScenario(false)}
                  className="underline hover:text-cyan-200 cursor-pointer"
                >
                  Clear Demo
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {assetRisks.map((pos) => {
                const styles = getHeatmapColor(pos.riskLevel);
                const isProfit = pos.unrealizedPnL >= 0;

                return (
                  <div
                    key={pos.id}
                    onClick={() => onSelectSymbol?.(pos.symbol)}
                    className={`rounded-xl p-3.5 border transition cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      styles.bg
                    } ${styles.border} ${styles.glow}`}
                  >
                    {/* Top row: Symbol, Side, and Risk Category */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm tracking-wide">
                            {pos.symbol}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              pos.side === 'BUY'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {pos.side === 'BUY' ? 'LONG' : 'SHORT'}
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${styles.badge}`}
                        >
                          {pos.riskLevel}
                        </span>
                      </div>

                      {/* Notional Exposure */}
                      <div className="bg-slate-950/60 rounded-lg p-2 mb-2 border border-slate-800/60">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Notional Exposure</span>
                          <span className="font-bold text-white">
                            {pos.exposurePct.toFixed(1)}% of Equity
                          </span>
                        </div>
                        <div className="text-sm font-bold text-white mt-0.5">
                          ${pos.notionalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Risk & Stop-Loss Proximity */}
                      <div className="space-y-1 text-[11px]">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400">Capital at Risk:</span>
                          <span className="font-bold text-rose-400">
                            ${pos.riskUSDT.toFixed(2)} ({pos.riskPctEquity.toFixed(2)}%)
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400">Stop-Loss Dist:</span>
                          <span className="text-slate-200">
                            ${pos.stopLossPrice.toLocaleString()} ({pos.slDistPct.toFixed(2)}% buffer)
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Unrealized PnL:</span>
                          <span
                            className={`font-bold flex items-center gap-0.5 ${
                              isProfit ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isProfit ? '+' : ''}${pos.unrealizedPnL.toFixed(2)} ({isProfit ? '+' : ''}
                            {pos.unrealizedPnLPercent.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action: De-Risk 50% */}
                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        Qty: {pos.quantity}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeRisk(pos.id);
                        }}
                        disabled={closingId === pos.id || isUsingDemo}
                        className="px-2 py-0.8 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded text-[10px] font-semibold transition cursor-pointer"
                        title="Close 50% of position to reduce concentration"
                      >
                        {closingId === pos.id ? 'De-Risking...' : 'De-Risk 50%'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Table Matrix View */
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase bg-slate-950/30">
                  <th className="p-2.5">Asset</th>
                  <th className="p-2.5">Side</th>
                  <th className="p-2.5">Notional Exposure</th>
                  <th className="p-2.5">% of Equity</th>
                  <th className="p-2.5">Capital at Risk (VaR)</th>
                  <th className="p-2.5">Risk %</th>
                  <th className="p-2.5">SL Distance</th>
                  <th className="p-2.5">Risk Status</th>
                  <th className="p-2.5 text-right">De-Risk Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {assetRisks.map((pos) => {
                  const styles = getHeatmapColor(pos.riskLevel);
                  return (
                    <tr
                      key={pos.id}
                      onClick={() => onSelectSymbol?.(pos.symbol)}
                      className="hover:bg-slate-850/50 transition cursor-pointer"
                    >
                      <td className="p-2.5 font-bold text-white">{pos.symbol}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            pos.side === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {pos.side}
                        </span>
                      </td>
                      <td className="p-2.5 text-white font-semibold">
                        ${pos.notionalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-slate-300 font-bold">
                        {pos.exposurePct.toFixed(1)}%
                      </td>
                      <td className="p-2.5 text-rose-400 font-bold">
                        ${pos.riskUSDT.toFixed(2)}
                      </td>
                      <td className="p-2.5 font-bold text-rose-400">
                        {pos.riskPctEquity.toFixed(2)}%
                      </td>
                      <td className="p-2.5 text-slate-300">
                        ${pos.stopLossPrice.toLocaleString()} ({pos.slDistPct.toFixed(2)}%)
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${styles.badge}`}
                        >
                          {pos.riskLevel}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeRisk(pos.id);
                          }}
                          disabled={closingId === pos.id || isUsingDemo}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] transition cursor-pointer"
                        >
                          De-Risk 50%
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Heatmap Legend */}
      <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/80 text-[10px] text-slate-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-300 uppercase">Risk Matrix Levels:</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Optimal (&lt;1% Risk)
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Moderate (1-1.5% Risk)
          </span>
          <span className="flex items-center gap-1 text-orange-400">
            <span className="w-2 h-2 rounded-full bg-orange-400" /> High (1.5-2.0% Risk)
          </span>
          <span className="flex items-center gap-1 text-rose-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Over-Concentrated (&gt;2% Risk / &gt;35% Equity)
          </span>
        </div>
        <div className="text-slate-500">
          Unallocated Free Margin Buffer: ${freeMarginUSDT.toLocaleString()} ({freeMarginPct.toFixed(1)}%)
        </div>
      </div>
    </div>
  );
};
