import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Header } from './components/Header.tsx';
import { ChartView } from './components/ChartView.tsx';
import { AIPanel } from './components/AIPanel.tsx';
import { TradePanel } from './components/TradePanel.tsx';
import { OrderBook } from './components/OrderBook.tsx';
import { PositionsTable } from './components/PositionsTable.tsx';
import { HftStream } from './components/HftStream.tsx';
import { QuantChatModal } from './components/QuantChatModal.tsx';
import { AlertsModal } from './components/AlertsModal.tsx';
import { RiskHeatmap } from './components/RiskHeatmap.tsx';
import { MarketBreadthItem } from './components/TrendStrengthGauge.tsx';

import { TickerData, OrderBook as OrderBookType } from './server/marketData.ts';
import { Candle, computeSMADivergence } from './server/indicators.ts';
import { AISignalResult } from './server/geminiAnalyst.ts';
import { AccountState } from './server/paperEngine.ts';
import { PriceAlert } from './types/alerts.ts';

// Subtle Web Audio API chime for price alert triggers
function playAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.15);
    gain2.gain.setValueAtTime(0.25, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.55);
  } catch (e) {
    // Audio Context might be locked prior to user gesture
  }
}

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
  const [interval, setInterval] = useState<string>('1d'); // Primary requested 1-Day timeframe

  // Market Data States
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBookType | null>(null);

  // Price Alerts State (persisted to localStorage)
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      const saved = localStorage.getItem('alphaquant_price_alerts');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // Seed initial sensible alerts so user can test the indicator immediately
    return [
      {
        id: 'alt-1',
        symbol: 'BTCUSDT',
        targetPrice: 92000,
        condition: 'CROSSES_ABOVE',
        createdAt: Date.now() - 3600000,
        triggered: false,
        note: '1-Day Key Resistance Breakout',
      },
      {
        id: 'alt-2',
        symbol: 'ETHUSDT',
        targetPrice: 3300,
        condition: 'CROSSES_BELOW',
        createdAt: Date.now() - 7200000,
        triggered: false,
        note: 'Macro Support Test',
      },
    ];
  });
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Account & Risk States
  const [account, setAccount] = useState<AccountState>({
    balanceUSDT: 100000,
    equityUSDT: 100000,
    marginUsed: 0,
    freeMargin: 100000,
    totalRealizedPnL: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    openPositions: [],
    tradeHistory: [],
    recentOrders: [],
  });
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(false);
  const [killSwitchReason, setKillSwitchReason] = useState<string | undefined>(undefined);

  // Gemini AI States
  const [signalResult, setSignalResult] = useState<AISignalResult | null>(null);
  const [loadingSignal, setLoadingSignal] = useState<boolean>(false);
  const [macroData, setMacroData] = useState<{
    summary: string;
    sources: { title: string; uri: string }[];
  } | null>(null);
  const [loadingMacro, setLoadingMacro] = useState<boolean>(false);

  // Prefill state for trade form from AI recommendation
  const [prefillTrade, setPrefillTrade] = useState<{
    symbol: string;
    side: 'BUY' | 'SELL';
    stopLossPrice: number;
    takeProfitPrice?: number;
    suggestedRiskPct: number;
  } | null>(null);

  // Quant Chat Modal
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Current selected asset price
  const currentTicker = tickers.find((t) => t.symbol === selectedSymbol);
  const currentPrice = currentTicker?.price || (selectedSymbol === 'BTCUSDT' ? 91450 : 3400);

  // Real-time evaluation of price alerts against ticker stream
  useEffect(() => {
    if (tickers.length === 0) return;

    setAlerts((prevAlerts) => {
      let hasChange = false;
      let newlyTriggered = false;

      const updated = prevAlerts.map((alert) => {
        if (alert.triggered) return alert;

        const liveTicker = tickers.find((t) => t.symbol === alert.symbol);
        if (!liveTicker) return alert;

        const price = liveTicker.price;
        let isTriggered = false;

        if (alert.condition === 'CROSSES_ABOVE' && price >= alert.targetPrice) {
          isTriggered = true;
        } else if (alert.condition === 'CROSSES_BELOW' && price <= alert.targetPrice) {
          isTriggered = true;
        }

        if (isTriggered) {
          hasChange = true;
          newlyTriggered = true;
          return {
            ...alert,
            triggered: true,
            triggeredAt: Date.now(),
            triggeredPrice: price,
          };
        }

        return alert;
      });

      if (hasChange) {
        if (newlyTriggered && soundEnabled) {
          playAlertChime();
        }
        try {
          localStorage.setItem('alphaquant_price_alerts', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      }

      return prevAlerts;
    });
  }, [tickers, soundEnabled]);

  // 1. Fetch Tickers & Account Status periodically
  const fetchTickers = useCallback(async () => {
    try {
      const res = await fetch('/api/market/tickers');
      const data = await res.json();
      if (data.success && data.tickers) {
        setTickers(data.tickers);
      }
    } catch (e) {
      // ignore transient polling errors
    }
  }, []);

  const fetchAccount = useCallback(async () => {
    try {
      const res = await fetch('/api/trade/account');
      const data = await res.json();
      if (data.success) {
        setAccount(data.account);
        setKillSwitchActive(data.riskConfig.killSwitchActive);
        setKillSwitchReason(data.riskConfig.killSwitchReason);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // 2. Fetch Candles for selected symbol and interval
  const fetchCandles = useCallback(async () => {
    try {
      const res = await fetch(`/api/market/candles?symbol=${selectedSymbol}&interval=${interval}&limit=100`);
      const data = await res.json();
      if (data.success && data.candles) {
        setCandles(data.candles);
      }
    } catch (e) {
      // ignore
    }
  }, [selectedSymbol, interval]);

  // 3. Fetch Order Book
  const fetchOrderBook = useCallback(async () => {
    try {
      const res = await fetch(`/api/market/orderbook?symbol=${selectedSymbol}&depth=8`);
      const data = await res.json();
      if (data.success && data.orderBook) {
        setOrderBook(data.orderBook);
      }
    } catch (e) {
      // ignore
    }
  }, [selectedSymbol]);

  // Initial Data Mount & Background Polling
  useEffect(() => {
    fetchTickers();
    fetchAccount();
    fetchCandles();
    fetchOrderBook();

    const tickerInterval = window.setInterval(fetchTickers, 2000);
    const accountInterval = window.setInterval(fetchAccount, 2500);
    const orderBookInterval = window.setInterval(fetchOrderBook, 1500);

    return () => {
      window.clearInterval(tickerInterval);
      window.clearInterval(accountInterval);
      window.clearInterval(orderBookInterval);
    };
  }, [fetchTickers, fetchAccount, fetchCandles, fetchOrderBook]);

  // Refresh candles when symbol or timeframe changes
  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

  // 4. Trigger Gemini 1-Day Deep Trend Forecast
  const handleRunAnalysis = async () => {
    try {
      setLoadingSignal(true);
      const res = await fetch('/api/ai/analyze-1d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: selectedSymbol }),
      });
      const data = await res.json();
      if (data.success && data.signalResult) {
        setSignalResult(data.signalResult);
      }
    } catch (err) {
      console.error('Error running 1D analysis:', err);
    } finally {
      setLoadingSignal(false);
    }
  };

  // 5. Trigger Google Search Grounding for Macro
  const handleRefreshMacro = async () => {
    try {
      setLoadingMacro(true);
      const res = await fetch(`/api/ai/search-macro?symbol=${selectedSymbol}`);
      const data = await res.json();
      if (data.success) {
        setMacroData({
          summary: data.summary,
          sources: data.sources || [],
        });
      }
    } catch (err) {
      console.error('Error fetching macro:', err);
    } finally {
      setLoadingMacro(false);
    }
  };

  // 6. Execute Trade Order
  const handlePlaceOrder = async (orderParams: {
    symbol: string;
    side: 'BUY' | 'SELL';
    orderType: 'MARKET' | 'LIMIT';
    quantity: number;
    stopLossPrice: number;
    takeProfitPrice?: number;
    signalSource?: 'MANUAL' | 'GEMINI_1D' | 'HFT_FAST';
  }) => {
    const res = await fetch('/api/trade/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderParams),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Trade rejected by Risk Manager.');
    }
    await fetchAccount();
  };

  // 7. Execute Fast HFT Scalp Trade
  const handleExecuteHftTrade = async (side: 'BUY' | 'SELL') => {
    const defaultRiskAmount = account.balanceUSDT * 0.015; // 1.5% risk
    const slDist = currentPrice * 0.018; // 1.8% stop distance
    const sl = side === 'BUY' ? currentPrice - slDist : currentPrice + slDist;
    const tp = side === 'BUY' ? currentPrice + slDist * 2.2 : currentPrice - slDist * 2.2;
    const calculatedQty = defaultRiskAmount / slDist;

    await handlePlaceOrder({
      symbol: selectedSymbol,
      side,
      orderType: 'MARKET',
      quantity: Number(calculatedQty.toFixed(currentPrice < 10 ? 1 : 4)),
      stopLossPrice: Number(sl.toFixed(currentPrice < 10 ? 4 : 2)),
      takeProfitPrice: Number(tp.toFixed(currentPrice < 10 ? 4 : 2)),
      signalSource: 'HFT_FAST',
    });
  };

  // 8. Close Position
  const handleClosePosition = async (positionId: string, partialRatio: number) => {
    const res = await fetch('/api/trade/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId, partialRatio }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchAccount();
    }
  };

  // 9. Kill Switch Toggle
  const handleToggleKillSwitch = async () => {
    const newActive = !killSwitchActive;
    await fetch('/api/trade/kill-switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        active: newActive,
        reason: newActive ? 'Manual emergency halt activated by operator.' : undefined,
      }),
    });
    await fetchAccount();
  };

  // 10. Reset Paper Account
  const handleResetPaper = async () => {
    await fetch('/api/trade/reset-paper', { method: 'POST' });
    await fetchAccount();
  };

  // 11. Price Alert Handlers
  const handleAddAlert = (newAlertData: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => {
    const newAlert: PriceAlert = {
      ...newAlertData,
      id: `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: Date.now(),
      triggered: false,
    };
    setAlerts((prev) => {
      const next = [newAlert, ...prev];
      try {
        localStorage.setItem('alphaquant_price_alerts', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      try {
        localStorage.setItem('alphaquant_price_alerts', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleDismissAlert = (id: string) => {
    setAlerts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      try {
        localStorage.setItem('alphaquant_price_alerts', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleClearTriggered = () => {
    setAlerts((prev) => {
      const next = prev.filter((a) => !a.triggered);
      try {
        localStorage.setItem('alphaquant_price_alerts', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const getPriceForSymbol = useCallback(
    (sym: string) => {
      const match = tickers.find((t) => t.symbol === sym);
      return match ? match.price : sym === 'BTCUSDT' ? 91450 : 3400;
    },
    [tickers]
  );

  const availableSymbols =
    tickers.length > 0
      ? tickers.map((t) => t.symbol)
      : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'AVAXUSDT'];

  const activeAlertsForSymbol = alerts.filter(
    (a) => a.symbol === selectedSymbol && !a.triggered
  ).length;

  // Trend Strength Indicator (SMA Divergence)
  // Calculates live SMA(20) vs SMA(50) spread divergence and sentiment score
  const divergence = useMemo(() => {
    if (candles.length >= 5) {
      const closes = candles.map((c) => c.close);
      return computeSMADivergence(closes, 20, 50);
    }
    const price = currentPrice;
    return computeSMADivergence([price * 0.985, price * 0.99, price * 0.995, price * 1.002, price], 20, 50);
  }, [candles, currentPrice]);

  // Market Breadth across all tracked crypto assets
  const marketBreadth: MarketBreadthItem[] = useMemo(() => {
    return tickers.map((t) => {
      const status: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
        t.change24hPercent > 0.8 ? 'BULLISH' : t.change24hPercent < -0.8 ? 'BEARISH' : 'NEUTRAL';
      return {
        symbol: t.symbol,
        price: t.price,
        change24hPercent: t.change24hPercent,
        smaStatus: status,
      };
    });
  }, [tickers]);

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col font-sans">
      {/* Top Header & Ticker Tape with Price Alerts and Trend Strength Indicator */}
      <Header
        selectedSymbol={selectedSymbol}
        onSelectSymbol={(sym) => {
          setSelectedSymbol(sym);
          setSignalResult(null);
          setPrefillTrade(null);
        }}
        tickers={tickers}
        account={{
          balanceUSDT: account.balanceUSDT,
          equityUSDT: account.equityUSDT,
          winRate: account.winRate,
          totalRealizedPnL: account.totalRealizedPnL,
        }}
        killSwitchActive={killSwitchActive}
        killSwitchReason={killSwitchReason}
        onToggleKillSwitch={handleToggleKillSwitch}
        onResetPaper={handleResetPaper}
        onOpenChat={() => setIsChatOpen(true)}
        alerts={alerts}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onDismissAlert={handleDismissAlert}
        divergence={divergence}
        marketBreadth={marketBreadth}
      />

      {/* Main Trading Terminal Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        {/* Top Grid: Chart & Order Book & HFT Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Central Chart View (7 cols) */}
          <div className="lg:col-span-8">
            <ChartView
              symbol={selectedSymbol}
              candles={candles}
              interval={interval}
              onChangeInterval={setInterval}
              targetPrice={signalResult?.targetPrice}
              stopLossPrice={signalResult?.stopLossPrice}
              onOpenAlerts={() => setIsAlertsOpen(true)}
              activeAlertsForSymbol={activeAlertsForSymbol}
            />
          </div>

          {/* Right Sidebar: Order Book & HFT Tape (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <OrderBook
              orderBook={orderBook}
              onSelectPrice={(p) => {
                // Populate price into prefill
              }}
            />
            <HftStream
              symbol={selectedSymbol}
              currentPrice={currentPrice}
              onExecuteHftTrade={handleExecuteHftTrade}
            />
          </div>
        </div>

        {/* Middle Grid: Gemini 1-Day AI Forecaster (7 cols) + Execution Ticket (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7">
            <AIPanel
              symbol={selectedSymbol}
              currentPrice={currentPrice}
              onPopulateTrade={(params) => setPrefillTrade(params)}
              signalResult={signalResult}
              loadingSignal={loadingSignal}
              onRunAnalysis={handleRunAnalysis}
              macroData={macroData}
              loadingMacro={loadingMacro}
              onRefreshMacro={handleRefreshMacro}
            />
          </div>

          <div className="lg:col-span-5">
            <TradePanel
              symbol={selectedSymbol}
              currentPrice={currentPrice}
              balanceUSDT={account.balanceUSDT}
              killSwitchActive={killSwitchActive}
              onPlaceOrder={handlePlaceOrder}
              prefill={prefillTrade}
            />
          </div>
        </div>

        {/* Bottom Section: Portfolio Risk Heatmap & Exposure Matrix */}
        <div className="w-full">
          <RiskHeatmap
            positions={account.openPositions}
            equityUSDT={account.equityUSDT}
            balanceUSDT={account.balanceUSDT}
            onClosePosition={handleClosePosition}
            onSelectSymbol={(sym) => setSelectedSymbol(sym)}
          />
        </div>

        {/* Positions, Trade History, and Order Audit Log */}
        <div className="w-full">
          <PositionsTable
            positions={account.openPositions}
            tradeHistory={account.tradeHistory}
            recentOrders={account.recentOrders}
            onClosePosition={handleClosePosition}
          />
        </div>
      </main>

      {/* Interactive Quant Chatbot Modal */}
      <QuantChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        symbol={selectedSymbol}
        currentPrice={currentPrice}
      />

      {/* Real-Time Price Alerts Manager Modal */}
      <AlertsModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        currentSymbol={selectedSymbol}
        currentPrice={currentPrice}
        availableSymbols={availableSymbols}
        onAddAlert={handleAddAlert}
        onDeleteAlert={handleDeleteAlert}
        onDismissAlert={handleDismissAlert}
        onClearTriggered={handleClearTriggered}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        getPriceForSymbol={getPriceForSymbol}
      />
    </div>
  );
}
