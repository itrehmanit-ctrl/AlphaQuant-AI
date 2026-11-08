import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface TradePanelProps {
  symbol: string;
  currentPrice: number;
  balanceUSDT: number;
  killSwitchActive: boolean;
  onPlaceOrder: (order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    orderType: 'MARKET' | 'LIMIT';
    quantity: number;
    stopLossPrice: number;
    takeProfitPrice?: number;
    signalSource?: 'MANUAL' | 'GEMINI_1D' | 'HFT_FAST';
  }) => Promise<void>;
  prefill?: {
    symbol: string;
    side: 'BUY' | 'SELL';
    stopLossPrice: number;
    takeProfitPrice?: number;
    suggestedRiskPct: number;
  } | null;
}

export const TradePanel: React.FC<TradePanelProps> = ({
  symbol,
  currentPrice,
  balanceUSDT,
  killSwitchActive,
  onPlaceOrder,
  prefill,
}) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [quantity, setQuantity] = useState<string>('0.1');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Default suggested stop loss based on 2% volatility distance
  useEffect(() => {
    if (currentPrice > 0 && !stopLoss) {
      const defaultDist = currentPrice * 0.02;
      const sl = side === 'BUY' ? currentPrice - defaultDist : currentPrice + defaultDist;
      setStopLoss(sl.toFixed(currentPrice < 10 ? 4 : 2));
      const tp = side === 'BUY' ? currentPrice + defaultDist * 2 : currentPrice - defaultDist * 2;
      setTakeProfit(tp.toFixed(currentPrice < 10 ? 4 : 2));
    }
  }, [currentPrice, side]);

  // Apply prefill when received from Gemini AI recommendation
  useEffect(() => {
    if (prefill) {
      setSide(prefill.side);
      setStopLoss(prefill.stopLossPrice.toFixed(currentPrice < 10 ? 4 : 2));
      if (prefill.takeProfitPrice) {
        setTakeProfit(prefill.takeProfitPrice.toFixed(currentPrice < 10 ? 4 : 2));
      }

      // Calculate compliant quantity for suggested risk
      const riskAmount = balanceUSDT * ((prefill.suggestedRiskPct || 1.5) / 100);
      const slDist = Math.abs(currentPrice - prefill.stopLossPrice);
      if (slDist > 0) {
        const calculatedQty = riskAmount / slDist;
        setQuantity(calculatedQty.toFixed(currentPrice < 10 ? 1 : 4));
      }
    }
  }, [prefill, currentPrice, balanceUSDT]);

  // Risk Math Calculations
  const numQty = parseFloat(quantity) || 0;
  const numSL = parseFloat(stopLoss) || 0;
  const numTP = parseFloat(takeProfit) || 0;
  const notionalValue = numQty * currentPrice;

  const stopLossDistance = Math.abs(currentPrice - numSL);
  const totalTradeRiskUSDT = numQty * stopLossDistance;
  const riskPercentOfBalance = balanceUSDT > 0 ? (totalTradeRiskUSDT / balanceUSDT) * 100 : 0;
  const maxAllowedRiskUSDT = balanceUSDT * 0.02; // Strictly 2% rule

  // Risk validation
  const isStopLossValid =
    numSL > 0 && (side === 'BUY' ? numSL < currentPrice : numSL > currentPrice);

  const isRiskCompliant =
    isStopLossValid && totalTradeRiskUSDT <= maxAllowedRiskUSDT + 0.05 && totalTradeRiskUSDT > 0;

  const maxAllowedQty =
    stopLossDistance > 0 ? maxAllowedRiskUSDT / stopLossDistance : 0;

  // Potential Profit calculation
  const takeProfitDistance = Math.abs(numTP - currentPrice);
  const potentialProfitUSDT = numTP > 0 ? numQty * takeProfitDistance : 0;
  const riskRewardRatio =
    totalTradeRiskUSDT > 0 && potentialProfitUSDT > 0
      ? (potentialProfitUSDT / totalTradeRiskUSDT).toFixed(2)
      : null;

  const handleClampToMax2Percent = () => {
    if (maxAllowedQty > 0) {
      setQuantity(maxAllowedQty.toFixed(currentPrice < 10 ? 1 : 4));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (killSwitchActive) {
      setFeedback({ type: 'error', text: 'Order blocked: Global Kill Switch is active.' });
      return;
    }

    if (!isStopLossValid) {
      setFeedback({
        type: 'error',
        text: `Mandatory Hard Stop-Loss required: Must be ${side === 'BUY' ? 'below' : 'above'} current mark price.`,
      });
      return;
    }

    if (!isRiskCompliant) {
      setFeedback({
        type: 'error',
        text: `Risk breach: Position risks ${riskPercentOfBalance.toFixed(2)}%, exceeding strictly enforced 2.0% maximum limit.`,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await onPlaceOrder({
        symbol,
        side,
        orderType,
        quantity: numQty,
        stopLossPrice: numSL,
        takeProfitPrice: numTP > 0 ? numTP : undefined,
        signalSource: prefill ? 'GEMINI_1D' : 'MANUAL',
      });
      setFeedback({ type: 'success', text: `Order filled successfully at $${currentPrice}` });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Execution error.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col font-mono text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">Execution Order Ticket</span>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded">
            2% Risk Rule Enforced
          </span>
        </div>
        <div className="text-slate-400 text-[11px]">
          Mark: <strong className="text-white">${currentPrice.toLocaleString()}</strong>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Buy / Sell Selector */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2 rounded font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              side === 'BUY'
                ? 'bg-emerald-600 text-white shadow glow-emerald'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>BUY / LONG</span>
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2 rounded font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              side === 'SELL'
                ? 'bg-rose-600 text-white shadow glow-rose'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>SELL / SHORT</span>
          </button>
        </div>

        {/* Order Type Toggle */}
        <div className="flex items-center justify-between text-slate-400">
          <span>Execution Type:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOrderType('MARKET')}
              className={`px-2.5 py-1 rounded border transition ${
                orderType === 'MARKET'
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}
            >
              Market
            </button>
            <button
              type="button"
              onClick={() => setOrderType('LIMIT')}
              className={`px-2.5 py-1 rounded border transition ${
                orderType === 'LIMIT'
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}
            >
              Limit
            </button>
          </div>
        </div>

        {/* Quantity Field */}
        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span>Position Size ({symbol.replace('USDT', '')})</span>
            <span>Notional: ${notionalValue.toFixed(2)}</span>
          </div>
          <input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
            placeholder="0.0"
          />
        </div>

        {/* Mandatory Stop Loss Field */}
        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1 text-rose-400 font-semibold">
              <ShieldAlert className="w-3 h-3" /> Hard Stop-Loss (Mandatory)
            </span>
            {stopLossDistance > 0 && (
              <span className="text-[11px]">
                Dist: ${stopLossDistance.toFixed(2)} ({((stopLossDistance / currentPrice) * 100).toFixed(2)}%)
              </span>
            )}
          </div>
          <input
            type="number"
            step="any"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className={`w-full bg-slate-950 border rounded-lg p-2.5 text-white font-mono focus:outline-none ${
              !isStopLossValid && numSL > 0
                ? 'border-rose-500/80 bg-rose-950/20'
                : 'border-slate-800 focus:border-rose-500'
            }`}
            placeholder={`e.g. ${side === 'BUY' ? (currentPrice * 0.98).toFixed(2) : (currentPrice * 1.02).toFixed(2)}`}
          />
        </div>

        {/* Take Profit Field */}
        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span className="text-emerald-400 font-semibold">Take-Profit Target</span>
            {riskRewardRatio && (
              <span className="text-cyan-400 font-semibold">
                R:R Ratio {riskRewardRatio} : 1
              </span>
            )}
          </div>
          <input
            type="number"
            step="any"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
            placeholder={`e.g. ${side === 'BUY' ? (currentPrice * 1.05).toFixed(2) : (currentPrice * 0.95).toFixed(2)}`}
          />
        </div>

        {/* Risk Management Pre-Flight Inspector Box */}
        <div
          className={`p-3 rounded-lg border font-mono ${
            isRiskCompliant
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center justify-between font-bold mb-1">
            <div className="flex items-center gap-1.5">
              {isRiskCompliant ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              )}
              <span>Pre-Flight Risk Check:</span>
            </div>
            <span>{isRiskCompliant ? 'APPROVED' : 'REJECTED'}</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span>Risk Amount:</span>
            <span className="font-bold">
              ${totalTradeRiskUSDT.toFixed(2)} / ${maxAllowedRiskUSDT.toFixed(2)} max
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span>Equity At Risk:</span>
            <span className={`font-bold ${riskPercentOfBalance > 2 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {riskPercentOfBalance.toFixed(2)}% (Max 2.0%)
            </span>
          </div>

          {!isRiskCompliant && maxAllowedQty > 0 && (
            <button
              type="button"
              onClick={handleClampToMax2Percent}
              className="mt-2 w-full py-1 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-200 rounded text-[11px] font-bold transition flex items-center justify-center gap-1"
            >
              <Calculator className="w-3 h-3" />
              <span>Auto-Clamp Size to 2.0% Risk Limit ({maxAllowedQty.toFixed(4)})</span>
            </button>
          )}
        </div>

        {/* Feedback Messages */}
        {feedback && (
          <div
            className={`p-2.5 rounded text-[11px] flex items-center gap-1.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isRiskCompliant || killSwitchActive || isSubmitting}
          className={`w-full py-3 rounded-lg font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 cursor-pointer ${
            killSwitchActive
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : !isRiskCompliant
              ? 'bg-rose-600/50 text-slate-300 cursor-not-allowed'
              : side === 'BUY'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950'
          }`}
        >
          {isSubmitting ? (
            <span>Routing Order...</span>
          ) : killSwitchActive ? (
            <span>Kill Switch Active</span>
          ) : !isRiskCompliant ? (
            <span>Fix Risk Compliance Before Order</span>
          ) : (
            <span>Execute {side} Order</span>
          )}
        </button>
      </form>
    </div>
  );
};
