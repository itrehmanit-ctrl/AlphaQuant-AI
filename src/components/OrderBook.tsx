import React from 'react';
import { OrderBook as OrderBookType } from '../server/marketData.ts';

interface OrderBookProps {
  orderBook: OrderBookType | null;
  onSelectPrice?: (price: number) => void;
}

export const OrderBook: React.FC<OrderBookProps> = ({ orderBook, onSelectPrice }) => {
  if (!orderBook) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-center h-full text-slate-500 font-mono text-xs">
        Loading Order Book...
      </div>
    );
  }

  // Calculate max volume for relative depth bars
  const maxAskVol = Math.max(...orderBook.asks.map((a) => a.total), 1);
  const maxBidVol = Math.max(...orderBook.bids.map((b) => b.total), 1);
  const maxVol = Math.max(maxAskVol, maxBidVol);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col font-mono text-[11px] h-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-slate-400">
        <span className="font-bold text-white text-xs">Order Book</span>
        <span>Spread: {orderBook.spread} ({orderBook.spreadPercent}%)</span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 text-slate-500 text-[10px] uppercase pb-1 border-b border-slate-800/50">
        <span>Price (USDT)</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (Sells) - Reversed so lowest ask is closest to spread */}
      <div className="flex flex-col-reverse space-y-reverse space-y-0.5 my-1 overflow-hidden">
        {orderBook.asks.slice(0, 7).map((ask, i) => {
          const depthPercent = (ask.total / maxVol) * 100;
          return (
            <div
              key={i}
              onClick={() => onSelectPrice?.(ask.price)}
              className="relative grid grid-cols-3 py-0.5 px-1 hover:bg-slate-800/60 cursor-pointer rounded transition"
            >
              {/* Depth background bar */}
              <div
                className="absolute right-0 top-0 bottom-0 bg-rose-500/15 pointer-events-none"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="text-rose-400 font-semibold relative z-10">
                {ask.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-right text-slate-300 relative z-10">{ask.amount}</span>
              <span className="text-right text-slate-400 relative z-10">{ask.total}</span>
            </div>
          );
        })}
      </div>

      {/* Mid Market Spread Bar */}
      <div className="py-1 px-2 my-1 bg-slate-950 border-y border-slate-800 text-center flex items-center justify-between text-xs">
        <span className="text-slate-400">Mid Price</span>
        <span className="font-bold text-white">
          ${((orderBook.asks[0]?.price + orderBook.bids[0]?.price) / 2 || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        </span>
      </div>

      {/* Bids (Buys) */}
      <div className="flex flex-col space-y-0.5 my-1 overflow-hidden">
        {orderBook.bids.slice(0, 7).map((bid, i) => {
          const depthPercent = (bid.total / maxVol) * 100;
          return (
            <div
              key={i}
              onClick={() => onSelectPrice?.(bid.price)}
              className="relative grid grid-cols-3 py-0.5 px-1 hover:bg-slate-800/60 cursor-pointer rounded transition"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="text-emerald-400 font-semibold relative z-10">
                {bid.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-right text-slate-300 relative z-10">{bid.amount}</span>
              <span className="text-right text-slate-400 relative z-10">{bid.total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
