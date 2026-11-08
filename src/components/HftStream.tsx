import React, { useEffect, useState } from 'react';
import { Zap, Activity, Clock, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface HftStreamProps {
  symbol: string;
  currentPrice: number;
  onExecuteHftTrade: (side: 'BUY' | 'SELL') => void;
}

interface TickEvent {
  id: string;
  price: number;
  qty: number;
  side: 'BUY' | 'SELL';
  time: string;
}

export const HftStream: React.FC<HftStreamProps> = ({
  symbol,
  currentPrice,
  onExecuteHftTrade,
}) => {
  const [ticks, setTicks] = useState<TickEvent[]>([]);
  const [latencyMs, setLatencyMs] = useState<number>(18);
  const [microSignal, setMicroSignal] = useState<'BUY' | 'SELL' | 'HOLD'>('BUY');
  const [confidence, setConfidence] = useState<number>(84);
  const [orderbookImbalance, setOrderbookImbalance] = useState<number>(14.2);

  // Poll fast micro-signal
  useEffect(() => {
    let isMounted = true;

    const fetchFastSignal = async () => {
      try {
        const start = performance.now();
        const res = await fetch(`/api/ai/fast-signal?symbol=${symbol}`);
        const data = await res.json();
        const duration = Math.round(performance.now() - start);

        if (isMounted && data.success) {
          setMicroSignal(data.signal);
          setConfidence(data.confidence);
          setLatencyMs(duration);
          setOrderbookImbalance(Math.round(data.orderbookImbalance * 100));
        }
      } catch (err) {
        // fallback
      }
    };

    fetchFastSignal();
    const interval = setInterval(fetchFastSignal, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbol]);

  // Simulate incoming high frequency tick tape
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentPrice <= 0) return;
      const isUp = Math.random() > 0.48;
      const delta = (Math.random() - 0.49) * (currentPrice * 0.0004);
      const tickPrice = Number((currentPrice + delta).toFixed(currentPrice < 10 ? 4 : 2));
      const tickQty = Number((Math.random() * 1.5 + 0.05).toFixed(3));
      const side = isUp ? 'BUY' : 'SELL';

      const newTick: TickEvent = {
        id: `t-${Date.now()}-${Math.random()}`,
        price: tickPrice,
        qty: tickQty,
        side,
        time: new Date().toISOString().split('T')[1].slice(0, 12),
      };

      setTicks((prev) => [newTick, ...prev.slice(0, 8)]);
    }, 700);

    return () => clearInterval(interval);
  }, [currentPrice]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col font-mono text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-1.5 font-bold text-white">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span>High Frequency Trading (HFT) Engine</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{latencyMs}ms latency</span>
          </span>
        </div>
      </div>

      {/* Micro Signal Display */}
      <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 mb-3">
        <div>
          <div className="text-[10px] text-slate-400 uppercase">Micro Algorithmic Bias</div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`px-2 py-0.5 rounded font-bold text-xs ${
                microSignal === 'BUY'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : microSignal === 'SELL'
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {microSignal}
            </span>
            <span className="text-[11px] text-slate-300">{confidence}% conf</span>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 uppercase">Book Imbalance</div>
          <div className="text-xs font-bold text-cyan-400 mt-1">
            {orderbookImbalance > 0 ? `+${orderbookImbalance}% Bid Flow` : `${orderbookImbalance}% Ask Flow`}
          </div>
        </div>
      </div>

      {/* Quick Scalp Execution with auto 2% risk check */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => onExecuteHftTrade('BUY')}
          className="flex-1 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 rounded font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Quick Scalp Long</span>
        </button>
        <button
          onClick={() => onExecuteHftTrade('SELL')}
          className="flex-1 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-300 rounded font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
        >
          <ArrowDownRight className="w-3.5 h-3.5" />
          <span>Quick Scalp Short</span>
        </button>
      </div>

      {/* Live High Frequency Tick Tape */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
        <div className="p-1.5 bg-slate-950 text-[10px] text-slate-500 uppercase flex justify-between">
          <span>Time</span>
          <span>Fill Price</span>
          <span>Size</span>
        </div>
        <div className="divide-y divide-slate-800/40 max-h-[120px] overflow-y-auto">
          {ticks.map((t) => (
            <div key={t.id} className="p-1.5 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">{t.time}</span>
              <span
                className={`font-semibold ${
                  t.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ${t.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-slate-300">{t.qty}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
