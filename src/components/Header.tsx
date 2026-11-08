import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  Cpu,
  RotateCcw,
  Bell,
  BellRing,
  AlertTriangle,
} from 'lucide-react';
import { PriceAlert } from '../types/alerts.ts';
import { TrendStrengthGauge, MarketBreadthItem } from './TrendStrengthGauge.tsx';
import { SMADivergenceResult } from '../server/indicators.ts';

interface Ticker {
  symbol: string;
  price: number;
  change24hPercent: number;
}

interface HeaderProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  tickers: Ticker[];
  account: {
    balanceUSDT: number;
    equityUSDT: number;
    winRate: number;
    totalRealizedPnL: number;
  };
  killSwitchActive: boolean;
  killSwitchReason?: string;
  onToggleKillSwitch: () => void;
  onResetPaper: () => void;
  onOpenChat: () => void;
  alerts: PriceAlert[];
  onOpenAlerts: () => void;
  onDismissAlert: (id: string) => void;
  divergence: SMADivergenceResult;
  marketBreadth?: MarketBreadthItem[];
}

export const Header: React.FC<HeaderProps> = ({
  selectedSymbol,
  onSelectSymbol,
  tickers,
  account,
  killSwitchActive,
  killSwitchReason,
  onToggleKillSwitch,
  onResetPaper,
  onOpenChat,
  alerts,
  onOpenAlerts,
  onDismissAlert,
  divergence,
  marketBreadth = [],
}) => {
  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);
  const hasTriggered = triggeredAlerts.length > 0;
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
      {/* Top Banner if Kill Switch is active */}
      {killSwitchActive && (
        <div className="bg-rose-500/15 border-b border-rose-500/40 text-rose-300 px-4 py-2 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="font-bold tracking-wide">GLOBAL KILL SWITCH ACTIVE:</span>
            <span>{killSwitchReason || 'Trading halted due to risk control limit.'}</span>
          </div>
          <button
            onClick={onToggleKillSwitch}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-semibold transition cursor-pointer"
          >
            Override & Resume
          </button>
        </div>
      )}

      {/* Triggered Price Alerts Banner */}
      {hasTriggered && (
        <div className="bg-amber-500/20 border-b border-amber-500/50 text-amber-200 px-4 py-2 text-xs font-mono flex items-center justify-between glow-amber">
          <div className="flex items-center gap-2 overflow-hidden">
            <BellRing className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <span className="font-bold tracking-wide text-amber-300 shrink-0">
              PRICE TARGET ALERT ({triggeredAlerts.length}):
            </span>
            <span className="truncate text-slate-200">
              {triggeredAlerts
                .map(
                  (a) =>
                    `${a.symbol} crossed $${a.targetPrice.toLocaleString()}${
                      a.triggeredPrice ? ` (at $${a.triggeredPrice.toLocaleString()})` : ''
                    }`
                )
                .join(' • ')}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenAlerts}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold transition shadow cursor-pointer"
            >
              Manage Alerts
            </button>
          </div>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Platform Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white font-mono">
                AlphaQuant <span className="text-emerald-400">AI</span>
              </h1>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold">
                PAPER TESTNET
              </span>
              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full">
                GEMINI 1D ENGINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Risk Hard-Capped (2% Per Trade) • Stop-Loss Strictly Enforced
            </p>
          </div>
        </div>

        {/* Visual Trend Strength Indicator (SMA Divergence) */}
        <div className="flex items-center">
          <TrendStrengthGauge
            selectedSymbol={selectedSymbol}
            divergence={divergence}
            marketBreadth={marketBreadth}
          />
        </div>

        {/* Real-time Account Summary */}
        <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2 font-mono">
          <div>
            <div className="text-[10px] uppercase text-slate-400">Equity</div>
            <div className="text-sm font-bold text-white">
              ${account.equityUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="h-7 w-[1px] bg-slate-800" />
          <div>
            <div className="text-[10px] uppercase text-slate-400">Realized PnL</div>
            <div
              className={`text-sm font-bold flex items-center gap-0.5 ${
                account.totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {account.totalRealizedPnL >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {account.totalRealizedPnL >= 0 ? '+' : ''}${account.totalRealizedPnL.toFixed(2)}
            </div>
          </div>
          <div className="h-7 w-[1px] bg-slate-800" />
          <div>
            <div className="text-[10px] uppercase text-slate-400">Win Rate</div>
            <div className="text-sm font-bold text-cyan-400">{account.winRate}%</div>
          </div>
        </div>

        {/* Actions, Alerts & Kill Switch */}
        <div className="flex items-center gap-2">
          {/* Price Alerts Button */}
          <button
            onClick={onOpenAlerts}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold font-mono transition cursor-pointer ${
              hasTriggered
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 glow-amber animate-pulse'
                : activeAlerts.length > 0
                ? 'bg-slate-900 text-amber-400 border border-amber-500/40 hover:border-amber-400'
                : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-slate-500'
            }`}
          >
            {hasTriggered ? (
              <BellRing className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            ) : (
              <Bell className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>
              {hasTriggered
                ? `ALERTS (${triggeredAlerts.length})`
                : activeAlerts.length > 0
                ? `Alerts (${activeAlerts.length})`
                : 'Set Alert'}
            </span>
          </button>

          {/* Gemini Chatbot trigger */}
          <button
            onClick={onOpenChat}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600/30 to-cyan-600/30 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 rounded-lg text-xs font-semibold font-mono transition cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Quant Chatbot
          </button>

          {/* Reset Paper Account */}
          <button
            onClick={onResetPaper}
            title="Reset paper balance to $100,000"
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Kill Switch Toggle */}
          <button
            onClick={onToggleKillSwitch}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
              killSwitchActive
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-rose-500/60 hover:text-rose-300'
            }`}
          >
            {killSwitchActive ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>KILL SWITCH ON</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>KILL SWITCH</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Ticker Tape */}
      <div className="border-t border-slate-800/80 bg-slate-950/60 px-4 py-1.5 overflow-x-auto flex items-center gap-6 no-scrollbar">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Zap className="w-3 h-3 text-emerald-400" /> LIVE TICKERS
        </span>
        <div className="flex items-center gap-4 text-xs font-mono">
          {tickers.map((t) => {
            const isSelected = selectedSymbol === t.symbol;
            const symTriggered = triggeredAlerts.some((a) => a.symbol === t.symbol);
            const symHasActive = activeAlerts.some((a) => a.symbol === t.symbol);

            return (
              <button
                key={t.symbol}
                onClick={() => onSelectSymbol(t.symbol)}
                className={`flex items-center gap-2 px-2.5 py-1 rounded transition whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border border-emerald-500/40 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span className="font-semibold">{t.symbol}</span>
                {symTriggered && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                )}
                {symHasActive && !symTriggered && (
                  <Bell className="w-2.5 h-2.5 text-amber-400/80 inline-block" />
                )}
                <span className="text-white">${t.price.toLocaleString()}</span>
                <span
                  className={`text-[11px] ${
                    t.change24hPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {t.change24hPercent >= 0 ? '+' : ''}
                  {t.change24hPercent.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
