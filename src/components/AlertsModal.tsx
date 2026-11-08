import React, { useState } from 'react';
import {
  X,
  Bell,
  BellRing,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Volume2,
  VolumeX,
  RotateCcw,
} from 'lucide-react';
import { PriceAlert } from '../types/alerts.ts';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: PriceAlert[];
  currentSymbol: string;
  currentPrice: number;
  availableSymbols: string[];
  onAddAlert: (newAlert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => void;
  onDeleteAlert: (id: string) => void;
  onDismissAlert: (id: string) => void;
  onClearTriggered: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  getPriceForSymbol: (symbol: string) => number;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  currentSymbol,
  currentPrice,
  availableSymbols,
  onAddAlert,
  onDeleteAlert,
  onDismissAlert,
  onClearTriggered,
  soundEnabled,
  onToggleSound,
  getPriceForSymbol,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(currentSymbol);
  const activeSymbolPrice = getPriceForSymbol(selectedSymbol) || currentPrice;

  const [targetPrice, setTargetPrice] = useState<string>(
    activeSymbolPrice ? (activeSymbolPrice * 1.02).toFixed(activeSymbolPrice < 10 ? 4 : 2) : ''
  );
  const [condition, setCondition] = useState<'CROSSES_ABOVE' | 'CROSSES_BELOW'>('CROSSES_ABOVE');
  const [note, setNote] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'TRIGGERED' | 'CREATE'>('ACTIVE');

  if (!isOpen) return null;

  // Auto-set condition based on current price
  const handlePriceChange = (val: string) => {
    setTargetPrice(val);
    const num = parseFloat(val);
    if (!isNaN(num) && activeSymbolPrice > 0) {
      if (num > activeSymbolPrice) {
        setCondition('CROSSES_ABOVE');
      } else {
        setCondition('CROSSES_BELOW');
      }
    }
  };

  const handleQuickPercent = (pct: number) => {
    if (activeSymbolPrice <= 0) return;
    const target = activeSymbolPrice * (1 + pct / 100);
    const formatted = target.toFixed(activeSymbolPrice < 10 ? 4 : 2);
    setTargetPrice(formatted);
    setCondition(pct > 0 ? 'CROSSES_ABOVE' : 'CROSSES_BELOW');
  };

  const handleSymbolChange = (sym: string) => {
    setSelectedSymbol(sym);
    const symPrice = getPriceForSymbol(sym);
    if (symPrice > 0) {
      setTargetPrice((symPrice * 1.02).toFixed(symPrice < 10 ? 4 : 2));
      setCondition('CROSSES_ABOVE');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(targetPrice);
    if (isNaN(num) || num <= 0) return;

    onAddAlert({
      symbol: selectedSymbol,
      targetPrice: num,
      condition,
      note: note.trim() || undefined,
    });

    setNote('');
    setActiveTab('ACTIVE');
  };

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-mono text-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <BellRing className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Real-Time Price Alerts</span>
                {triggeredAlerts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] font-bold animate-pulse">
                    {triggeredAlerts.length} Triggered
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Visual header indicators and alerts triggered upon price crossing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSound}
              title={soundEnabled ? 'Mute alert chime' : 'Enable alert chime'}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-800 text-amber-400 border-slate-700'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ACTIVE'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Active Alerts</span>
              <span className="px-1.5 py-0.2 bg-slate-950 text-slate-300 rounded text-[10px]">
                {activeAlerts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('TRIGGERED')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'TRIGGERED'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Triggered History</span>
              <span className="px-1.5 py-0.2 bg-slate-950 text-slate-300 rounded text-[10px]">
                {triggeredAlerts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('CREATE')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'CREATE'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Alert</span>
            </button>
          </div>

          {activeTab === 'TRIGGERED' && triggeredAlerts.length > 0 && (
            <button
              onClick={onClearTriggered}
              className="text-[11px] text-slate-400 hover:text-rose-400 transition flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* TAB 1: CREATE ALERT */}
          {activeTab === 'CREATE' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Symbol selector */}
              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">Select Symbol</label>
                <div className="grid grid-cols-4 gap-2">
                  {availableSymbols.map((sym) => {
                    const isSel = selectedSymbol === sym;
                    const price = getPriceForSymbol(sym);
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => handleSymbolChange(sym)}
                        className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                          isSel
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-semibold text-xs">{sym}</div>
                        <div className="text-[10px] text-slate-400">${price.toLocaleString()}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Price vs Target Price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <span className="text-[10px] text-slate-400 uppercase">Current Mark Price</span>
                  <div className="text-white font-bold text-base mt-1">
                    ${activeSymbolPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 text-[11px]">Target Price (USDT)</label>
                  <input
                    type="number"
                    step="any"
                    value={targetPrice}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    placeholder="e.g. 95000"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-bold text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Quick % Offset Helpers */}
              <div>
                <span className="text-[10px] text-slate-400 uppercase block mb-1.5">
                  Quick Price Offsets from Current
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 5, -1, -2, -3, -5].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleQuickPercent(pct)}
                      className={`px-2.5 py-1 rounded text-[11px] border transition cursor-pointer ${
                        pct > 0
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/40'
                          : 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-900/40'
                      }`}
                    >
                      {pct > 0 ? `+${pct}%` : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition Toggle */}
              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">Trigger Condition</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCondition('CROSSES_ABOVE')}
                    className={`py-2 rounded font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      condition === 'CROSSES_ABOVE'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Price Crosses Above &ge;</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondition('CROSSES_BELOW')}
                    className={`py-2 rounded font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      condition === 'CROSSES_BELOW'
                        ? 'bg-rose-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>Price Crosses Below &le;</span>
                  </button>
                </div>
              </div>

              {/* Optional Note */}
              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">Note / Strategy Tag (Optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. 1D breakout entry trigger or take profit alert"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-bold rounded-lg text-sm transition shadow-lg shadow-amber-950 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span>Arm Price Alert</span>
              </button>
            </form>
          )}

          {/* TAB 2: ACTIVE ALERTS */}
          {activeTab === 'ACTIVE' && (
            <div className="space-y-3">
              {activeAlerts.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Bell className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                  <p className="font-semibold text-slate-300">No active alerts armed</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Set a price target to receive visual alerts in the header when prices cross.
                  </p>
                  <button
                    onClick={() => setActiveTab('CREATE')}
                    className="mt-4 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Alert</span>
                  </button>
                </div>
              ) : (
                activeAlerts.map((alert) => {
                  const symPrice = getPriceForSymbol(alert.symbol);
                  const diff = alert.targetPrice - symPrice;
                  const diffPct = symPrice > 0 ? (diff / symPrice) * 100 : 0;
                  const isAbove = alert.condition === 'CROSSES_ABOVE';

                  return (
                    <div
                      key={alert.id}
                      className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isAbove
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isAbove ? (
                            <ArrowUpRight className="w-5 h-5" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{alert.symbol}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                              {isAbove ? 'CROSSES ABOVE' : 'CROSSES BELOW'}
                            </span>
                            {alert.note && (
                              <span className="text-[11px] text-slate-400 italic">"{alert.note}"</span>
                            )}
                          </div>

                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                            <span>
                              Target: <strong className="text-white">${alert.targetPrice.toLocaleString()}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Current: ${symPrice.toLocaleString()}
                            </span>
                            <span>•</span>
                            <span className={diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {diff >= 0 ? '+' : ''}${diff.toFixed(2)} ({diffPct >= 0 ? '+' : ''}
                              {diffPct.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onDeleteAlert(alert.id)}
                          className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                          title="Delete alert"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: TRIGGERED ALERTS */}
          {activeTab === 'TRIGGERED' && (
            <div className="space-y-3">
              {triggeredAlerts.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <CheckCircle2 className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                  <p className="font-semibold text-slate-300">No triggered alerts</p>
                  <p className="text-xs text-slate-500 mt-1">
                    When a target price is reached, triggered alerts appear here with timestamp and fill price.
                  </p>
                </div>
              ) : (
                triggeredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between gap-3 glow-amber"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shrink-0 text-amber-400 animate-pulse">
                        <AlertTriangle className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{alert.symbol}</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-500/60 text-[10px] font-bold">
                            TARGET CROSSED!
                          </span>
                        </div>

                        <div className="text-xs text-slate-300 mt-0.5">
                          Target was <strong className="text-white">${alert.targetPrice.toLocaleString()}</strong>
                          {alert.triggeredPrice && (
                            <span> (Crossed at ${alert.triggeredPrice.toLocaleString()})</span>
                          )}
                          {alert.triggeredAt && (
                            <span className="text-slate-400 ml-2">
                              at {new Date(alert.triggeredAt).toLocaleTimeString()}
                            </span>
                          )}
                        </div>

                        {alert.note && (
                          <div className="text-[11px] text-amber-300/80 italic mt-0.5">
                            "{alert.note}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onDismissAlert(alert.id)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition cursor-pointer"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => onDeleteAlert(alert.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-slate-400 text-[11px]">
          <span>Price alerts evaluate continuously against live market ticks.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
