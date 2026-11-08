import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  ColorType,
} from 'lightweight-charts';
import { Layers, Eye, EyeOff, BarChart2, Bell } from 'lucide-react';
import { calculateEMA } from '../server/indicators.ts';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartViewProps {
  symbol: string;
  candles: Candle[];
  interval: string;
  onChangeInterval: (interval: string) => void;
  targetPrice?: number;
  stopLossPrice?: number;
  onOpenAlerts?: () => void;
  activeAlertsForSymbol?: number;
}

export const ChartView: React.FC<ChartViewProps> = ({
  symbol,
  candles,
  interval,
  onChangeInterval,
  targetPrice,
  stopLossPrice,
  onOpenAlerts,
  activeAlertsForSymbol,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // EMA series refs
  const ema9SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Overlays toggle state
  const [showEMA, setShowEMA] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  // Initialize and mount Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.3)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.3)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#38bdf8',
          width: 1,
          style: 2,
          labelBackgroundColor: '#0284c7',
        },
        horzLine: {
          color: '#38bdf8',
          width: 1,
          style: 2,
          labelBackgroundColor: '#0284c7',
        },
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#334155',
        autoScale: true,
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    // Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    candlestickSeriesRef.current = candleSeries;

    // Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // EMA series
    ema9SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#38bdf8', // sky blue
      lineWidth: 1,
      title: 'EMA 9',
    });

    ema21SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#fbbf24', // amber
      lineWidth: 1,
      title: 'EMA 21',
    });

    ema50SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#a855f7', // purple
      lineWidth: 1,
      title: 'EMA 50',
    });

    ema200SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#f97316', // orange
      lineWidth: 2,
      title: 'EMA 200',
    });

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data when candles change
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || candles.length === 0) return;

    // Sort ascending by time
    const sorted = [...candles].sort((a, b) => a.time - b.time);

    const candleData: CandlestickData[] = sorted.map((c) => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candlestickSeriesRef.current.setData(candleData);

    // Volume data
    if (volumeSeriesRef.current && showVolume) {
      const volData: HistogramData[] = sorted.map((c) => ({
        time: c.time as any,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
      }));
      volumeSeriesRef.current.setData(volData);
    }

    // EMAs computation and update
    const closes = sorted.map((c) => c.close);
    const times = sorted.map((c) => c.time);

    const updateEMALine = (
      seriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>,
      period: number
    ) => {
      if (!seriesRef.current) return;
      if (!showEMA || closes.length < period) {
        seriesRef.current.setData([]);
        return;
      }
      const emaValues = calculateEMA(closes, period);
      const offset = closes.length - emaValues.length;
      const lineData: LineData[] = [];
      for (let i = 0; i < emaValues.length; i++) {
        lineData.push({
          time: times[i + offset] as any,
          value: Number(emaValues[i].toFixed(2)),
        });
      }
      seriesRef.current.setData(lineData);
    };

    updateEMALine(ema9SeriesRef, 9);
    updateEMALine(ema21SeriesRef, 21);
    updateEMALine(ema50SeriesRef, 50);
    updateEMALine(ema200SeriesRef, 200);

    // Price lines for Stop Loss and Target if available
    try {
      if (stopLossPrice && candlestickSeriesRef.current) {
        candlestickSeriesRef.current.createPriceLine({
          price: stopLossPrice,
          color: '#ef4444',
          lineWidth: 2,
          lineStyle: 1, // Dotted
          axisLabelVisible: true,
          title: 'STOP LOSS',
        });
      }
      if (targetPrice && candlestickSeriesRef.current) {
        candlestickSeriesRef.current.createPriceLine({
          price: targetPrice,
          color: '#10b981',
          lineWidth: 2,
          lineStyle: 1,
          axisLabelVisible: true,
          title: 'TARGET (TP)',
        });
      }
    } catch (e) {
      // ignore dynamic line duplicates
    }

    chartRef.current.timeScale().fitContent();
  }, [candles, showEMA, showVolume, targetPrice, stopLossPrice]);

  const intervals = [
    { label: '1D (Long-Term)', value: '1d', highlight: true },
    { label: '4H', value: '4h' },
    { label: '1H', value: '1h' },
    { label: '15M', value: '15m' },
    { label: '1M (HFT)', value: '1m', badge: 'FAST' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[520px]">
      {/* Chart Top Controls */}
      <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-white">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <span>{symbol}</span>
          </div>

          {/* Timeframe Selectors */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {intervals.map((int) => (
              <button
                key={int.value}
                onClick={() => onChangeInterval(int.value)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition flex items-center gap-1 cursor-pointer ${
                  interval === int.value
                    ? int.highlight
                      ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40'
                      : 'bg-slate-800 text-cyan-400 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>{int.label}</span>
                {int.badge && (
                  <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 rounded font-mono">
                    {int.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Indicators & Overlays toggles */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setShowEMA(!showEMA)}
            className={`px-2.5 py-1 rounded border transition flex items-center gap-1.5 ${
              showEMA
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/40'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>EMA Ribbon (9/21/50/200)</span>
          </button>

          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`px-2.5 py-1 rounded border transition flex items-center gap-1.5 cursor-pointer ${
              showVolume
                ? 'bg-slate-800 text-slate-300 border-slate-700'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            {showVolume ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Vol</span>
          </button>

          {onOpenAlerts && (
            <button
              onClick={onOpenAlerts}
              className={`px-2.5 py-1 rounded border transition flex items-center gap-1.5 cursor-pointer ${
                activeAlertsForSymbol && activeAlertsForSymbol > 0
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
              title="Set or view price alerts for this asset"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Alert {activeAlertsForSymbol ? `(${activeAlertsForSymbol})` : ''}</span>
            </button>
          )}
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div className="flex-1 w-full relative">
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      {/* Footer Legend */}
      <div className="px-3 py-1.5 border-t border-slate-800/80 bg-slate-950/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-sky-400 inline-block" /> EMA 9
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> EMA 21
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-purple-400 inline-block" /> EMA 50
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-orange-400 inline-block" /> EMA 200
          </span>
        </div>
        <div className="flex items-center gap-3">
          {targetPrice && (
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> TP: ${targetPrice.toLocaleString()}
            </span>
          )}
          {stopLossPrice && (
            <span className="text-rose-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> SL: ${stopLossPrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
