export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  rsi: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  atr14: number;
  supportLevel: number;
  resistanceLevel: number;
  trend: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const smaValues: number[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  smaValues.push(sum / period);

  for (let i = period; i < prices.length; i++) {
    sum += prices[i] - prices[i - period];
    smaValues.push(sum / period);
  }

  return smaValues;
}

export interface SMADivergenceResult {
  fastPeriod: number;
  slowPeriod: number;
  fastSMA: number;
  slowSMA: number;
  divergencePercent: number;
  priceVsFastPercent: number;
  sentimentScore: number; // 0 - 100
  sentimentLabel: 'STRONG_BEARISH' | 'BEARISH' | 'NEUTRAL' | 'BULLISH' | 'STRONG_BULLISH';
  momentumText: string;
}

function formatSMADivergence(
  fastPeriod: number,
  slowPeriod: number,
  fastSMA: number,
  slowSMA: number,
  div: number,
  priceDiv: number
): SMADivergenceResult {
  // Composite score combining SMA(fast)/SMA(slow) spread and live Price vs Fast SMA spread
  const weightedDiv = div * 0.75 + priceDiv * 0.25;
  const rawScore = 50 + weightedDiv * 7.5;
  const sentimentScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  let sentimentLabel: SMADivergenceResult['sentimentLabel'] = 'NEUTRAL';
  let momentumText = 'Consolidation / Equilibrium';

  if (sentimentScore >= 75) {
    sentimentLabel = 'STRONG_BULLISH';
    momentumText = `Strong Bullish Expansion (+${div.toFixed(2)}% Spread)`;
  } else if (sentimentScore >= 58) {
    sentimentLabel = 'BULLISH';
    momentumText = `Bullish Divergence (+${div.toFixed(2)}% Spread)`;
  } else if (sentimentScore <= 25) {
    sentimentLabel = 'STRONG_BEARISH';
    momentumText = `Heavy Bearish Breakdown (${div.toFixed(2)}% Spread)`;
  } else if (sentimentScore <= 42) {
    sentimentLabel = 'BEARISH';
    momentumText = `Bearish Divergence (${div.toFixed(2)}% Spread)`;
  } else {
    sentimentLabel = 'NEUTRAL';
    momentumText = `Equilibrium (${div >= 0 ? '+' : ''}${div.toFixed(2)}% Spread)`;
  }

  return {
    fastPeriod,
    slowPeriod,
    fastSMA: Number(fastSMA.toFixed(2)),
    slowSMA: Number(slowSMA.toFixed(2)),
    divergencePercent: Number(div.toFixed(2)),
    priceVsFastPercent: Number(priceDiv.toFixed(2)),
    sentimentScore,
    sentimentLabel,
    momentumText,
  };
}

export function computeSMADivergence(
  prices: number[],
  fastPeriod: number = 20,
  slowPeriod: number = 50
): SMADivergenceResult {
  const currentPrice = prices[prices.length - 1] || 0;
  if (prices.length < 5) {
    return {
      fastPeriod,
      slowPeriod,
      fastSMA: currentPrice,
      slowSMA: currentPrice,
      divergencePercent: 0,
      priceVsFastPercent: 0,
      sentimentScore: 50,
      sentimentLabel: 'NEUTRAL',
      momentumText: 'Awaiting candle ticks',
    };
  }

  const fPeriod = Math.min(fastPeriod, Math.max(3, Math.floor(prices.length / 2)));
  const sPeriod = Math.min(slowPeriod, prices.length);

  const fastSMAArr = calculateSMA(prices, fPeriod);
  const slowSMAArr = calculateSMA(prices, sPeriod);

  const fastSMA = fastSMAArr[fastSMAArr.length - 1] || currentPrice;
  const slowSMA = slowSMAArr[slowSMAArr.length - 1] || currentPrice;

  const div = slowSMA > 0 ? ((fastSMA - slowSMA) / slowSMA) * 100 : 0;
  const priceDiv = fastSMA > 0 ? ((currentPrice - fastSMA) / fastSMA) * 100 : 0;

  return formatSMADivergence(fPeriod, sPeriod, fastSMA, slowSMA, div, priceDiv);
}

/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const emaValues: number[] = [];

  // Initial SMA as starting point
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let currentEMA = sum / period;
  emaValues.push(currentEMA);

  for (let i = period; i < prices.length; i++) {
    currentEMA = prices[i] * k + currentEMA * (1 - k);
    emaValues.push(currentEMA);
  }

  return emaValues;
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length <= period) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

/**
 * Calculate MACD (12, 26, 9)
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macdLine: number; signalLine: number; histogram: number } {
  if (prices.length < slowPeriod + signalPeriod) {
    return { macdLine: 0, signalLine: 0, histogram: 0 };
  }

  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  // Align length to slowEMA length
  const offset = slowPeriod - fastPeriod;
  const macdSeries: number[] = [];
  for (let i = 0; i < slowEMA.length; i++) {
    macdSeries.push(fastEMA[i + offset] - slowEMA[i]);
  }

  const signalSeries = calculateEMA(macdSeries, signalPeriod);
  const lastMacd = macdSeries[macdSeries.length - 1] || 0;
  const lastSignal = signalSeries[signalSeries.length - 1] || 0;

  return {
    macdLine: Number(lastMacd.toFixed(2)),
    signalLine: Number(lastSignal.toFixed(2)),
    histogram: Number((lastMacd - lastSignal).toFixed(2)),
  };
}

/**
 * Calculate Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length <= period) return 0;

  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prevClose),
      Math.abs(current.low - prevClose)
    );
    trs.push(tr);
  }

  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }

  return Number(atr.toFixed(2));
}

/**
 * Calculate Bollinger Bands (20, 2)
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number; middle: number; lower: number } {
  if (prices.length < period) {
    const p = prices[prices.length - 1] || 0;
    return { upper: p, middle: p, lower: p };
  }

  const slice = prices.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: Number((mean + stdDevMultiplier * stdDev).toFixed(2)),
    middle: Number(mean.toFixed(2)),
    lower: Number((mean - stdDevMultiplier * stdDev).toFixed(2)),
  };
}

/**
 * Extract Key Support and Resistance from swing highs & lows
 */
export function findSupportResistance(candles: Candle[]): { supportLevel: number; resistanceLevel: number } {
  if (candles.length < 10) {
    const last = candles[candles.length - 1]?.close || 100;
    return { supportLevel: last * 0.95, resistanceLevel: last * 1.05 };
  }

  const recent = candles.slice(-30);
  const lows = recent.map((c) => c.low).sort((a, b) => a - b);
  const highs = recent.map((c) => c.high).sort((a, b) => b - a);

  // Take the 2nd lowest and 2nd highest to eliminate extreme wicks
  const support = lows[1] || lows[0];
  const resistance = highs[1] || highs[0];

  return {
    supportLevel: Number(support.toFixed(2)),
    resistanceLevel: Number(resistance.toFixed(2)),
  };
}

/**
 * Compute aggregate technical indicators bundle for given candles
 */
export function computeIndicators(candles: Candle[]): TechnicalIndicators {
  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1] || 0;

  const ema9Series = calculateEMA(closes, 9);
  const ema21Series = calculateEMA(closes, 21);
  const ema50Series = calculateEMA(closes, 50);
  const ema200Series = calculateEMA(closes, 200);

  const ema9 = ema9Series[ema9Series.length - 1] || currentPrice;
  const ema21 = ema21Series[ema21Series.length - 1] || currentPrice;
  const ema50 = ema50Series[ema50Series.length - 1] || currentPrice;
  const ema200 = ema200Series[ema200Series.length - 1] || currentPrice;

  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const bollingerBands = calculateBollingerBands(closes);
  const atr14 = calculateATR(candles, 14);
  const { supportLevel, resistanceLevel } = findSupportResistance(candles);

  // Trend determination based on moving average stack and price location
  let trend: TechnicalIndicators['trend'] = 'NEUTRAL';
  if (currentPrice > ema9 && ema9 > ema21 && ema21 > ema50 && ema50 > ema200) {
    trend = 'STRONG_BULLISH';
  } else if (currentPrice > ema50 && ema9 > ema21) {
    trend = 'BULLISH';
  } else if (currentPrice < ema9 && ema9 < ema21 && ema21 < ema50 && ema50 < ema200) {
    trend = 'STRONG_BEARISH';
  } else if (currentPrice < ema50 && ema9 < ema21) {
    trend = 'BEARISH';
  }

  return {
    ema9: Number(ema9.toFixed(2)),
    ema21: Number(ema21.toFixed(2)),
    ema50: Number(ema50.toFixed(2)),
    ema200: Number(ema200.toFixed(2)),
    rsi,
    macd,
    bollingerBands,
    atr14,
    supportLevel,
    resistanceLevel,
    trend,
  };
}
