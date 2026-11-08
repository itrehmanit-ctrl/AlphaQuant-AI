import { riskManager } from './riskManager.ts';
import { getTicker } from './marketData.ts';

export interface Position {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  notionalValue: number;
  stopLossPrice: number;
  takeProfitPrice?: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  openedAt: number;
  signalSource: 'MANUAL' | 'GEMINI_1D' | 'HFT_FAST' | 'STRATEGY_EMA';
}

export interface TradeOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  requestedPrice?: number;
  executedPrice: number;
  quantity: number;
  slippage: number;
  stopLossPrice: number;
  takeProfitPrice?: number;
  status: 'FILLED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
  timestamp: number;
  signalSource: 'MANUAL' | 'GEMINI_1D' | 'HFT_FAST' | 'STRATEGY_EMA';
}

export interface TradeHistoryItem {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  realizedPnL: number;
  realizedPnLPercent: number;
  openedAt: number;
  closedAt: number;
  closeReason: 'MANUAL' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'KILL_SWITCH';
}

export interface AccountState {
  balanceUSDT: number;
  equityUSDT: number;
  marginUsed: number;
  freeMargin: number;
  totalRealizedPnL: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  openPositions: Position[];
  tradeHistory: TradeHistoryItem[];
  recentOrders: TradeOrder[];
}

export class PaperTradingEngine {
  private balanceUSDT: number = 100000; // $100,000 initial testnet funds
  private positions: Position[] = [];
  private tradeHistory: TradeHistoryItem[] = [];
  private recentOrders: TradeOrder[] = [];
  private winningTrades: number = 0;
  private losingTrades: number = 0;
  private totalRealizedPnL: number = 0;

  constructor() {
    // Seed an initial trade history so metrics look realistic right away
    this.seedSampleHistory();
  }

  private seedSampleHistory() {
    this.tradeHistory = [
      {
        id: 'th-1',
        symbol: 'BTCUSDT',
        side: 'BUY',
        entryPrice: 89400,
        exitPrice: 91200,
        quantity: 0.5,
        realizedPnL: 900,
        realizedPnLPercent: 2.01,
        openedAt: Date.now() - 86400000 * 2,
        closedAt: Date.now() - 86400000 * 1,
        closeReason: 'TAKE_PROFIT',
      },
      {
        id: 'th-2',
        symbol: 'ETHUSDT',
        side: 'BUY',
        entryPrice: 3310,
        exitPrice: 3415,
        quantity: 8,
        realizedPnL: 840,
        realizedPnLPercent: 3.17,
        openedAt: Date.now() - 86400000 * 1.5,
        closedAt: Date.now() - 86400000 * 0.8,
        closeReason: 'TAKE_PROFIT',
      },
    ];
    this.winningTrades = 2;
    this.totalRealizedPnL = 1740;
    this.balanceUSDT = 101740;
  }

  public resetAccount() {
    this.balanceUSDT = 100000;
    this.positions = [];
    this.tradeHistory = [];
    this.recentOrders = [];
    this.winningTrades = 0;
    this.losingTrades = 0;
    this.totalRealizedPnL = 0;
    riskManager.setKillSwitch(false);
  }

  public async getAccountState(): Promise<AccountState> {
    await this.updatePositionsMarketPrice();

    let totalUnrealized = 0;
    let marginUsed = 0;

    for (const pos of this.positions) {
      totalUnrealized += pos.unrealizedPnL;
      marginUsed += pos.notionalValue;
    }

    const equityUSDT = this.balanceUSDT + totalUnrealized;
    const freeMargin = Math.max(0, equityUSDT - marginUsed);
    const totalClosed = this.winningTrades + this.losingTrades;
    const winRate = totalClosed > 0 ? Number(((this.winningTrades / totalClosed) * 100).toFixed(1)) : 0;

    // Update risk manager drawdown check
    riskManager.updateEquityTracking(equityUSDT);

    return {
      balanceUSDT: Number(this.balanceUSDT.toFixed(2)),
      equityUSDT: Number(equityUSDT.toFixed(2)),
      marginUsed: Number(marginUsed.toFixed(2)),
      freeMargin: Number(freeMargin.toFixed(2)),
      totalRealizedPnL: Number(this.totalRealizedPnL.toFixed(2)),
      totalTrades: totalClosed,
      winningTrades: this.winningTrades,
      losingTrades: this.losingTrades,
      winRate,
      openPositions: [...this.positions],
      tradeHistory: [...this.tradeHistory].slice(0, 50),
      recentOrders: [...this.recentOrders].slice(0, 50),
    };
  }

  public async executeOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    orderType: 'MARKET' | 'LIMIT';
    quantity: number;
    stopLossPrice: number;
    takeProfitPrice?: number;
    signalSource?: 'MANUAL' | 'GEMINI_1D' | 'HFT_FAST' | 'STRATEGY_EMA';
  }): Promise<{ success: boolean; order: TradeOrder; message: string }> {
    const ticker = await getTicker(params.symbol);
    const markPrice = ticker.price;
    const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 1. Strict Risk Management Evaluation
    const riskCheck = riskManager.evaluateTradeRisk({
      accountBalance: this.balanceUSDT,
      symbol: params.symbol,
      side: params.side,
      entryPrice: markPrice,
      requestedQuantity: params.quantity,
      stopLossPrice: params.stopLossPrice,
    });

    if (!riskCheck.allowed) {
      const rejectedOrder: TradeOrder = {
        id: orderId,
        symbol: params.symbol.toUpperCase(),
        side: params.side,
        orderType: params.orderType,
        executedPrice: 0,
        quantity: params.quantity,
        slippage: 0,
        stopLossPrice: params.stopLossPrice,
        takeProfitPrice: params.takeProfitPrice,
        status: 'REJECTED',
        rejectionReason: riskCheck.reason,
        timestamp: Date.now(),
        signalSource: params.signalSource || 'MANUAL',
      };
      this.recentOrders.unshift(rejectedOrder);
      return {
        success: false,
        order: rejectedOrder,
        message: riskCheck.reason || 'Risk checks rejected the order.',
      };
    }

    // Realistic Simulated Slippage (e.g. 0.02% to 0.05%)
    const slippagePct = (Math.random() * 0.0003 + 0.0001) * (params.side === 'BUY' ? 1 : -1);
    const executedPrice = Number((markPrice * (1 + slippagePct)).toFixed(markPrice < 10 ? 4 : 2));
    const slippage = Number((Math.abs(executedPrice - markPrice)).toFixed(4));
    const notional = executedPrice * params.quantity;

    // Check balance
    if (notional > this.balanceUSDT) {
      const rejectedOrder: TradeOrder = {
        id: orderId,
        symbol: params.symbol.toUpperCase(),
        side: params.side,
        orderType: params.orderType,
        executedPrice: 0,
        quantity: params.quantity,
        slippage: 0,
        stopLossPrice: params.stopLossPrice,
        takeProfitPrice: params.takeProfitPrice,
        status: 'REJECTED',
        rejectionReason: 'INSUFFICIENT FUNDS: Margin required exceeds available account balance.',
        timestamp: Date.now(),
        signalSource: params.signalSource || 'MANUAL',
      };
      this.recentOrders.unshift(rejectedOrder);
      return { success: false, order: rejectedOrder, message: 'Insufficient funds for notional order.' };
    }

    const filledOrder: TradeOrder = {
      id: orderId,
      symbol: params.symbol.toUpperCase(),
      side: params.side,
      orderType: params.orderType,
      executedPrice,
      quantity: params.quantity,
      slippage,
      stopLossPrice: params.stopLossPrice,
      takeProfitPrice: params.takeProfitPrice,
      status: 'FILLED',
      timestamp: Date.now(),
      signalSource: params.signalSource || 'MANUAL',
    };

    // Add to active open positions
    const newPosition: Position = {
      id: `pos-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      symbol: params.symbol.toUpperCase(),
      side: params.side,
      entryPrice: executedPrice,
      currentPrice: executedPrice,
      quantity: params.quantity,
      notionalValue: notional,
      stopLossPrice: params.stopLossPrice,
      takeProfitPrice: params.takeProfitPrice,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      openedAt: Date.now(),
      signalSource: params.signalSource || 'MANUAL',
    };

    this.positions.push(newPosition);
    this.recentOrders.unshift(filledOrder);

    return {
      success: true,
      order: filledOrder,
      message: `Order filled at $${executedPrice} (Slippage: $${slippage}). Position open.`,
    };
  }

  public async closePosition(positionId: string, partialRatio: number = 1.0): Promise<{ success: boolean; message: string }> {
    const idx = this.positions.findIndex((p) => p.id === positionId);
    if (idx === -1) return { success: false, message: 'Position not found' };

    const pos = this.positions[idx];
    const ticker = await getTicker(pos.symbol);
    const exitPrice = ticker.price;
    const closeQty = pos.quantity * partialRatio;

    const priceDiff = pos.side === 'BUY' ? exitPrice - pos.entryPrice : pos.entryPrice - exitPrice;
    const realizedPnL = Number((priceDiff * closeQty).toFixed(2));
    const realizedPnLPercent = Number(((priceDiff / pos.entryPrice) * 100).toFixed(2));

    this.balanceUSDT += realizedPnL;
    this.totalRealizedPnL += realizedPnL;

    if (realizedPnL >= 0) this.winningTrades++;
    else this.losingTrades++;

    this.tradeHistory.unshift({
      id: `th-${Date.now()}`,
      symbol: pos.symbol,
      side: pos.side,
      entryPrice: pos.entryPrice,
      exitPrice,
      quantity: closeQty,
      realizedPnL,
      realizedPnLPercent,
      openedAt: pos.openedAt,
      closedAt: Date.now(),
      closeReason: 'MANUAL',
    });

    if (partialRatio >= 0.999) {
      this.positions.splice(idx, 1);
    } else {
      pos.quantity -= closeQty;
      pos.notionalValue = pos.quantity * pos.currentPrice;
    }

    return {
      success: true,
      message: `Closed ${pos.symbol} position (${(partialRatio * 100).toFixed(0)}%). PnL: ${realizedPnL >= 0 ? '+' : ''}$${realizedPnL} (${realizedPnLPercent}%)`,
    };
  }

  public async updatePositionsMarketPrice(): Promise<void> {
    for (let i = this.positions.length - 1; i >= 0; i--) {
      const pos = this.positions[i];
      const ticker = await getTicker(pos.symbol);
      const currentPrice = ticker.price;
      pos.currentPrice = currentPrice;
      pos.notionalValue = Number((pos.quantity * currentPrice).toFixed(2));

      const priceDiff = pos.side === 'BUY' ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
      pos.unrealizedPnL = Number((priceDiff * pos.quantity).toFixed(2));
      pos.unrealizedPnLPercent = Number(((priceDiff / pos.entryPrice) * 100).toFixed(2));

      // Automated Stop-Loss Trigger
      let hitStopLoss = false;
      if (pos.side === 'BUY' && currentPrice <= pos.stopLossPrice) {
        hitStopLoss = true;
      } else if (pos.side === 'SELL' && currentPrice >= pos.stopLossPrice) {
        hitStopLoss = true;
      }

      // Automated Take-Profit Trigger
      let hitTakeProfit = false;
      if (pos.takeProfitPrice && pos.takeProfitPrice > 0) {
        if (pos.side === 'BUY' && currentPrice >= pos.takeProfitPrice) {
          hitTakeProfit = true;
        } else if (pos.side === 'SELL' && currentPrice <= pos.takeProfitPrice) {
          hitTakeProfit = true;
        }
      }

      if (hitStopLoss || hitTakeProfit) {
        const reason = hitStopLoss ? 'STOP_LOSS' : 'TAKE_PROFIT';
        const realizedPnL = pos.unrealizedPnL;
        const realizedPnLPercent = pos.unrealizedPnLPercent;

        this.balanceUSDT += realizedPnL;
        this.totalRealizedPnL += realizedPnL;

        if (realizedPnL >= 0) this.winningTrades++;
        else this.losingTrades++;

        this.tradeHistory.unshift({
          id: `th-${Date.now()}`,
          symbol: pos.symbol,
          side: pos.side,
          entryPrice: pos.entryPrice,
          exitPrice: currentPrice,
          quantity: pos.quantity,
          realizedPnL,
          realizedPnLPercent,
          openedAt: pos.openedAt,
          closedAt: Date.now(),
          closeReason: reason,
        });

        this.positions.splice(i, 1);
      }
    }
  }
}

export const paperEngine = new PaperTradingEngine();
