import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { getAllTickers, getCandles, getOrderBook, getTicker } from './src/server/marketData.ts';
import { computeIndicators } from './src/server/indicators.ts';
import { riskManager } from './src/server/riskManager.ts';
import { paperEngine } from './src/server/paperEngine.ts';
import {
  analyze1DayTrend,
  chatWithQuantAssistant,
  getFastHftSignal,
  getMarketCatalystSearch,
} from './src/server/geminiAnalyst.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());

// ==========================================
// 1. STATUS & HEALTH
// ==========================================
app.get('/api/status', (req: Request, res: Response) => {
  const riskConfig = riskManager.getConfig();
  res.json({
    status: 'ONLINE',
    exchange: 'Binance (Public Live Feeds) / Simulated Testnet ccxt Router',
    paperTrading: true,
    riskManagement: {
      maxRiskPerTrade: `${riskConfig.maxRiskPerTradePercent}%`,
      hardStopLossRequired: true,
      maxDailyDrawdown: `${riskConfig.maxDailyDrawdownPercent}%`,
      killSwitchActive: riskConfig.killSwitchActive,
      killSwitchReason: riskConfig.killSwitchReason || null,
    },
    models: {
      deepReasoning: 'gemini-4-argon (ThinkingLevel.HIGH)',
      macroSearch: 'gemini-3.8-flash (Search Grounding)',
      hftMicro: 'gemini-3.1-flash-lite / Algorithmic Ribbon',
    },
    timestamp: Date.now(),
  });
});

// ==========================================
// 2. MARKET DATA
// ==========================================
app.get('/api/market/tickers', async (req: Request, res: Response) => {
  try {
    const tickers = await getAllTickers();
    res.json({ success: true, tickers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/market/ticker', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'BTCUSDT';
    const ticker = await getTicker(symbol);
    res.json({ success: true, ticker });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/market/candles', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'BTCUSDT';
    const interval = (req.query.interval as string) || '1d';
    const limit = parseInt((req.query.limit as string) || '100', 10);
    const candles = await getCandles(symbol, interval, limit);
    res.json({ success: true, symbol, interval, count: candles.length, candles });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/market/orderbook', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'BTCUSDT';
    const depth = parseInt((req.query.depth as string) || '12', 10);
    const orderBook = await getOrderBook(symbol, depth);
    res.json({ success: true, orderBook });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/market/indicators', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'BTCUSDT';
    const interval = (req.query.interval as string) || '1d';
    const candles = await getCandles(symbol, interval, 100);
    const indicators = computeIndicators(candles);
    res.json({ success: true, symbol, interval, indicators });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. GEMINI AI QUANT ANALYST
// ==========================================
// 1-Day Deep Trend Forecast with High Thinking
app.post('/api/ai/analyze-1d', async (req: Request, res: Response) => {
  try {
    const symbol = req.body.symbol || 'BTCUSDT';
    const signalResult = await analyze1DayTrend(symbol);
    res.json({ success: true, signalResult });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Real-time Google Search Grounding for macro catalysts
app.get('/api/ai/search-macro', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'BTCUSDT';
    const macroData = await getMarketCatalystSearch(symbol);
    res.json({ success: true, symbol, ...macroData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fast HFT Microsecond-Level Signal
app.get('/api/ai/fast-signal', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'BTCUSDT';
    const fastSignal = await getFastHftSignal(symbol);
    res.json({ success: true, symbol, ...fastSignal });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Interactive Multi-turn Quant Chatbot
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { messages, symbol } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'Messages array is required.' });
    }
    const reply = await chatWithQuantAssistant(messages, symbol || 'BTCUSDT');
    res.json({ success: true, reply });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. TRADE EXECUTION & RISK MANAGEMENT
// ==========================================
app.get('/api/trade/account', async (req: Request, res: Response) => {
  try {
    const accountState = await paperEngine.getAccountState();
    const riskConfig = riskManager.getConfig();
    res.json({ success: true, account: accountState, riskConfig });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/trade/order', async (req: Request, res: Response) => {
  try {
    const { symbol, side, orderType, quantity, stopLossPrice, takeProfitPrice, signalSource } = req.body;

    if (!symbol || !side || !quantity || !stopLossPrice) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: symbol, side, quantity, and stopLossPrice are strictly mandatory.',
      });
    }

    const result = await paperEngine.executeOrder({
      symbol,
      side,
      orderType: orderType || 'MARKET',
      quantity: parseFloat(quantity),
      stopLossPrice: parseFloat(stopLossPrice),
      takeProfitPrice: takeProfitPrice ? parseFloat(takeProfitPrice) : undefined,
      signalSource: signalSource || 'MANUAL',
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/trade/close', async (req: Request, res: Response) => {
  try {
    const { positionId, partialRatio } = req.body;
    if (!positionId) {
      return res.status(400).json({ success: false, message: 'Position ID is required' });
    }
    const result = await paperEngine.closePosition(positionId, partialRatio || 1.0);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/trade/kill-switch', (req: Request, res: Response) => {
  const { active, reason } = req.body;
  riskManager.setKillSwitch(!!active, reason);
  res.json({
    success: true,
    killSwitchActive: riskManager.getConfig().killSwitchActive,
    reason: riskManager.getConfig().killSwitchReason,
  });
});

app.post('/api/trade/reset-paper', (req: Request, res: Response) => {
  paperEngine.resetAccount();
  res.json({ success: true, message: 'Paper balance reset to $100,000.00 USDT' });
});

// ==========================================
// 5. VITE & STATIC FILES MOUNT
// ==========================================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`>>> AlphaQuant Terminal Backend active at http://localhost:${port}`);
  });
}

startServer();
