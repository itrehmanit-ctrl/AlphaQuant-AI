import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  History,
  FileText,
} from 'lucide-react';
import { Position, TradeHistoryItem, TradeOrder } from '../server/paperEngine.ts';

interface PositionsTableProps {
  positions: Position[];
  tradeHistory: TradeHistoryItem[];
  recentOrders: TradeOrder[];
  onClosePosition: (positionId: string, partialRatio: number) => Promise<void>;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({
  positions,
  tradeHistory,
  recentOrders,
  onClosePosition,
}) => {
  const [activeTab, setActiveTab] = useState<'POSITIONS' | 'HISTORY' | 'ORDERS'>('POSITIONS');
  const [closingId, setClosingId] = useState<string | null>(null);

  const handleClose = async (id: string, ratio: number) => {
    try {
      setClosingId(id);
      await onClosePosition(id, ratio);
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs flex flex-col">
      {/* Tab Switcher */}
      <div className="p-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('POSITIONS')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'POSITIONS'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Open Positions</span>
            <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded text-[10px]">
              {positions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Trade History</span>
            <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded text-[10px]">
              {tradeHistory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ORDERS'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Order Logs</span>
            <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded text-[10px]">
              {recentOrders.length}
            </span>
          </button>
        </div>
      </div>

      {/* Content 1: Open Positions */}
      {activeTab === 'POSITIONS' && (
        <div className="overflow-x-auto min-h-[160px]">
          {positions.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              No active positions. Execute a trade or apply a 1-Day Gemini recommendation above.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase bg-slate-950/30">
                  <th className="p-3">Symbol</th>
                  <th className="p-3">Side</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Entry Price</th>
                  <th className="p-3">Mark Price</th>
                  <th className="p-3">Unrealized PnL</th>
                  <th className="p-3">Hard Stop-Loss</th>
                  <th className="p-3">Take-Profit</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {positions.map((pos) => {
                  const isProfit = pos.unrealizedPnL >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-slate-850/50 transition">
                      <td className="p-3 font-bold text-white flex items-center gap-1.5">
                        <span>{pos.symbol}</span>
                        <span className="text-[10px] text-slate-500">({pos.signalSource})</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pos.side === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {pos.side === 'BUY' ? 'LONG' : 'SHORT'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-200">{pos.quantity}</td>
                      <td className="p-3 text-slate-300">${pos.entryPrice.toLocaleString()}</td>
                      <td className="p-3 text-white font-semibold">${pos.currentPrice.toLocaleString()}</td>
                      <td className="p-3">
                        <div
                          className={`font-bold flex items-center gap-1 ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          <span>
                            {isProfit ? '+' : ''}${pos.unrealizedPnL.toFixed(2)} ({isProfit ? '+' : ''}
                            {pos.unrealizedPnLPercent.toFixed(2)}%)
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-rose-400 font-semibold">
                        ${pos.stopLossPrice.toLocaleString()}
                      </td>
                      <td className="p-3 text-emerald-400">
                        {pos.takeProfitPrice ? `$${pos.takeProfitPrice.toLocaleString()}` : '—'}
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          onClick={() => handleClose(pos.id, 0.5)}
                          disabled={closingId === pos.id}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition cursor-pointer"
                        >
                          Close 50%
                        </button>
                        <button
                          onClick={() => handleClose(pos.id, 1.0)}
                          disabled={closingId === pos.id}
                          className="px-2 py-1 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-300 rounded text-[10px] font-bold transition cursor-pointer"
                        >
                          Market Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Content 2: Trade History */}
      {activeTab === 'HISTORY' && (
        <div className="overflow-x-auto min-h-[160px]">
          {tradeHistory.length === 0 ? (
            <div className="py-10 text-center text-slate-500">No closed trades recorded yet.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase bg-slate-950/30">
                  <th className="p-3">Closed Date</th>
                  <th className="p-3">Symbol</th>
                  <th className="p-3">Side</th>
                  <th className="p-3">Entry</th>
                  <th className="p-3">Exit</th>
                  <th className="p-3">Realized PnL</th>
                  <th className="p-3 text-right">Close Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tradeHistory.map((item) => {
                  const isProfit = item.realizedPnL >= 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-850/50 transition">
                      <td className="p-3 text-slate-400">
                        {new Date(item.closedAt).toLocaleTimeString()}
                      </td>
                      <td className="p-3 font-bold text-white">{item.symbol}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.side === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {item.side}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">${item.entryPrice.toLocaleString()}</td>
                      <td className="p-3 text-slate-200">${item.exitPrice.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}${item.realizedPnL.toFixed(2)} ({isProfit ? '+' : ''}
                          {item.realizedPnLPercent.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.closeReason}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Content 3: Recent Order Logs */}
      {activeTab === 'ORDERS' && (
        <div className="overflow-x-auto min-h-[160px]">
          {recentOrders.length === 0 ? (
            <div className="py-10 text-center text-slate-500">No orders logged in this session.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase bg-slate-950/30">
                  <th className="p-3">Time</th>
                  <th className="p-3">Symbol</th>
                  <th className="p-3">Side</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Execution Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-850/50 transition">
                    <td className="p-3 text-slate-400">
                      {new Date(ord.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-3 font-bold text-white">{ord.symbol}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ord.side === 'BUY'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {ord.side}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{ord.quantity}</td>
                    <td className="p-3 text-white">
                      {ord.executedPrice > 0 ? `$${ord.executedPrice.toLocaleString()}` : '—'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ord.status === 'FILLED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="p-3 text-right text-slate-400 text-[10px]">
                      {ord.rejectionReason ? (
                        <span className="text-rose-400">{ord.rejectionReason}</span>
                      ) : (
                        <span>Slip: ${ord.slippage} | SL: ${ord.stopLossPrice}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
