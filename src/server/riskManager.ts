export interface RiskConfig {
  maxRiskPerTradePercent: number; // strictly 2%
  maxDailyDrawdownPercent: number; // strictly 5%
  killSwitchActive: boolean;
  killSwitchReason?: string;
  paperMode: boolean;
}

export interface RiskEvaluation {
  allowed: boolean;
  reason?: string;
  maxCompliantQuantity?: number;
  riskAmountUSDT: number;
  actualRiskPercent: number;
  stopLossDistance: number;
  suggestedStopLoss?: number;
}

export class RiskManager {
  private config: RiskConfig = {
    maxRiskPerTradePercent: 2.0,
    maxDailyDrawdownPercent: 5.0,
    killSwitchActive: false,
    paperMode: true,
  };

  private dailyStartEquity: number = 100000;
  private peakEquity: number = 100000;
  private lastResetDay: number = new Date().getUTCDate();

  constructor() {
    this.checkDailyRoll();
  }

  private checkDailyRoll() {
    const currentDay = new Date().getUTCDate();
    if (currentDay !== this.lastResetDay) {
      this.lastResetDay = currentDay;
      this.dailyStartEquity = this.peakEquity;
      // Note: Kill switch can be reset on daily roll if user desires, or kept latched
    }
  }

  public getConfig(): RiskConfig {
    return { ...this.config };
  }

  public setKillSwitch(active: boolean, reason?: string) {
    this.config.killSwitchActive = active;
    this.config.killSwitchReason = active ? (reason || 'Manual emergency stop triggered') : undefined;
  }

  public updateEquityTracking(currentEquity: number) {
    this.checkDailyRoll();
    if (currentEquity > this.peakEquity) {
      this.peakEquity = currentEquity;
    }

    // Check Daily Drawdown limit from day start or peak
    const dailyDrawdown = ((this.dailyStartEquity - currentEquity) / this.dailyStartEquity) * 100;
    if (dailyDrawdown >= this.config.maxDailyDrawdownPercent && !this.config.killSwitchActive) {
      this.setKillSwitch(
        true,
        `CRITICAL RISK BREACH: Daily drawdown reached ${dailyDrawdown.toFixed(2)}%, exceeding hard ${this.config.maxDailyDrawdownPercent}% limit.`
      );
    }
  }

  public evaluateTradeRisk(params: {
    accountBalance: number;
    symbol: string;
    side: 'BUY' | 'SELL';
    entryPrice: number;
    requestedQuantity: number;
    stopLossPrice?: number;
  }): RiskEvaluation {
    const { accountBalance, side, entryPrice, requestedQuantity, stopLossPrice } = params;

    // 1. Check Global Kill Switch
    if (this.config.killSwitchActive) {
      return {
        allowed: false,
        reason: `KILL SWITCH ACTIVE: ${this.config.killSwitchReason || 'All trading disabled'}`,
        riskAmountUSDT: 0,
        actualRiskPercent: 0,
        stopLossDistance: 0,
      };
    }

    // 2. Enforce Hard Stop-Loss presence and logical placement
    if (!stopLossPrice || stopLossPrice <= 0) {
      const defaultAtrDistance = entryPrice * 0.025; // 2.5% fallback SL
      const suggested = side === 'BUY' ? entryPrice - defaultAtrDistance : entryPrice + defaultAtrDistance;
      return {
        allowed: false,
        reason: 'CRITICAL RISK RULE VIOLATION: Hard Stop-Loss is mandatory on every trade.',
        suggestedStopLoss: Number(suggested.toFixed(2)),
        riskAmountUSDT: 0,
        actualRiskPercent: 0,
        stopLossDistance: 0,
      };
    }

    if (side === 'BUY' && stopLossPrice >= entryPrice) {
      return {
        allowed: false,
        reason: `INVALID STOP LOSS: For LONG (BUY) orders, Stop Loss (${stopLossPrice}) must be below Entry Price (${entryPrice}).`,
        riskAmountUSDT: 0,
        actualRiskPercent: 0,
        stopLossDistance: 0,
      };
    }

    if (side === 'SELL' && stopLossPrice <= entryPrice) {
      return {
        allowed: false,
        reason: `INVALID STOP LOSS: For SHORT (SELL) orders, Stop Loss (${stopLossPrice}) must be above Entry Price (${entryPrice}).`,
        riskAmountUSDT: 0,
        actualRiskPercent: 0,
        stopLossDistance: 0,
      };
    }

    // 3. Enforce Max 2% balance risk rule
    const maxRiskUSDT = accountBalance * (this.config.maxRiskPerTradePercent / 100);
    const stopLossDistance = Math.abs(entryPrice - stopLossPrice);
    const totalTradeRiskUSDT = requestedQuantity * stopLossDistance;
    const actualRiskPercent = (totalTradeRiskUSDT / accountBalance) * 100;

    // Max quantity allowed under 2% risk limit
    const maxCompliantQuantity = stopLossDistance > 0 ? maxRiskUSDT / stopLossDistance : 0;

    if (totalTradeRiskUSDT > maxRiskUSDT + 0.01) {
      return {
        allowed: false,
        reason: `POSITION TOO LARGE: Trade risks $${totalTradeRiskUSDT.toFixed(2)} (${actualRiskPercent.toFixed(2)}%), which exceeds the 2.0% max limit ($${maxRiskUSDT.toFixed(2)}).`,
        maxCompliantQuantity: Number(maxCompliantQuantity.toFixed(4)),
        riskAmountUSDT: totalTradeRiskUSDT,
        actualRiskPercent: Number(actualRiskPercent.toFixed(2)),
        stopLossDistance: Number(stopLossDistance.toFixed(2)),
      };
    }

    return {
      allowed: true,
      maxCompliantQuantity: Number(maxCompliantQuantity.toFixed(4)),
      riskAmountUSDT: Number(totalTradeRiskUSDT.toFixed(2)),
      actualRiskPercent: Number(actualRiskPercent.toFixed(2)),
      stopLossDistance: Number(stopLossDistance.toFixed(2)),
    };
  }
}

export const riskManager = new RiskManager();
