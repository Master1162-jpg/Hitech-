import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Eye, EyeOff, ZoomIn, ZoomOut } from 'lucide-react';
import { computeIndicators } from '../lib/tradingEngine';
import type { Candle, RoundPhase } from '../types';

interface CandlestickChartProps {
  candles: Candle[];
  currentPrice: number;
  secondsRemaining: number;
  phase: RoundPhase;
  sentimentBuyPct: number;
  sentimentSellPct: number;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  currentPrice,
  secondsRemaining,
  phase,
  sentimentBuyPct,
  sentimentSellPct,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(34);
  const [showOverlays, setShowOverlays] = useState(true);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const visibleCandles = useMemo(() => {
    return candles.slice(-visibleCount);
  }, [candles, visibleCount]);

  const indicators = useMemo(() => computeIndicators(candles), [candles]);
  const visibleEma5 = useMemo(() => indicators.ema5.slice(-visibleCount), [indicators.ema5, visibleCount]);
  const visibleEma10 = useMemo(() => indicators.ema10.slice(-visibleCount), [indicators.ema10, visibleCount]);

  // Rolling 12-period Bollinger upper & lower envelope curves (Kaizenfin dual outer blue bands)
  const bollingerSeries = useMemo(() => {
    const closes = candles.map((c) => c.close);
    const period = 12;
    const upperAll: number[] = [];
    const lowerAll: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      const start = Math.max(0, i - period + 1);
      const slice = closes.slice(start, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
      const variance = slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / slice.length;
      const std = Math.sqrt(variance);
      upperAll.push(mean + std * 1.9);
      lowerAll.push(mean - std * 1.9);
    }
    return {
      upper: upperAll.slice(-visibleCount),
      lower: lowerAll.slice(-visibleCount),
    };
  }, [candles, visibleCount]);

  const activeHoverCandle =
    hoverIdx !== null && visibleCandles[hoverIdx]
      ? visibleCandles[hoverIdx]
      : visibleCandles[visibleCandles.length - 1];

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.scale(dpr, dpr);

      const W = rect.width;
      const H = rect.height;
      const isCompact = W < 640;
      const rightAxisW = isCompact ? 68 : 76;
      const bottomAxisH = 22;
      const topPad = isCompact ? 34 : 44;
      const leftPad = isCompact ? 20 : 14;
      const plotW = Math.max(100, W - rightAxisW);
      const plotH = Math.max(120, H - topPad - bottomAxisH);
      const volH = isCompact ? Math.min(28, plotH * 0.12) : Math.min(48, plotH * 0.18);
      const priceAreaH = plotH - volH - 10;

      // 1. Background
      ctx.fillStyle = '#070b16';
      ctx.fillRect(0, 0, W, H);

      // Subtle Kaizenfin dotted world-map atmosphere in center background
      ctx.fillStyle = 'rgba(148, 163, 184, 0.055)';
      for (let gx = leftPad + 14; gx < plotW - 10; gx += 16) {
        for (let gy = topPad + 16; gy < topPad + priceAreaH - 6; gy += 14) {
          const wave = Math.sin(gx * 0.025) * Math.cos(gy * 0.032);
          if (wave > -0.15) {
            ctx.beginPath();
            ctx.arc(gx, gy, 1.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Centered Brand Watermark (HITECHTRADE H-Wing Monogram + Slanted Wordmark)
      {
        const wmCx = leftPad + (plotW - leftPad) / 2;
        const wmCy = topPad + priceAreaH * 0.48;
        const wmScale = isCompact ? Math.min(0.88, Math.max(0.68, plotW / 380)) : Math.min(1.22, Math.max(0.95, plotW / 760));

        ctx.save();
        ctx.translate(wmCx, wmCy);
        ctx.scale(wmScale, wmScale);

        // Stylized sweeping H-wing emblem on left of wordmark
        ctx.save();
        ctx.translate(-158, -28);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.11)';
        ctx.beginPath();
        ctx.moveTo(4, 37.5);
        ctx.bezierCurveTo(13, 44.5, 34, 45.5, 52, 38.5);
        ctx.bezierCurveTo(37, 42, 18, 41, 11, 35.5);
        ctx.lineTo(17.5, 13);
        ctx.lineTo(10.5, 13);
        ctx.closePath();
        ctx.fill();

        // Left & right slanted pillars of H
        ctx.beginPath();
        ctx.moveTo(14.5, 11);
        ctx.lineTo(22.5, 11);
        ctx.lineTo(17.2, 35);
        ctx.lineTo(9.2, 35);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(35.5, 9);
        ctx.lineTo(45.5, 6.5);
        ctx.lineTo(37.8, 35);
        ctx.lineTo(29.8, 35);
        ctx.closePath();
        ctx.fill();

        // Emerald cross-bar
        ctx.fillStyle = 'rgba(0, 212, 170, 0.13)';
        ctx.beginPath();
        ctx.moveTo(17.5, 21.5);
        ctx.lineTo(36.5, 18.5);
        ctx.lineTo(34.8, 25.5);
        ctx.lineTo(15.8, 27.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Slanted metallic HITECH + TRADE wordmark
        ctx.save();
        ctx.transform(1, 0, -0.18, 1, 0, 0);
        ctx.font = '800 32px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(226, 232, 240, 0.09)';
        ctx.fillText('HITECH', -96, -3);
        const hitechW = ctx.measureText('HITECH').width;
        ctx.fillStyle = 'rgba(0, 212, 170, 0.11)';
        ctx.fillText('TRADE', -96 + hitechW + 3, -3);
        ctx.restore();

        // Subtle speed streak divider & BTC/USDT caption
        ctx.fillStyle = 'rgba(56, 189, 248, 0.09)';
        ctx.fillRect(-102, 16, 232, 1.5);

        ctx.font = '600 10.5px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.11)';
        ctx.fillText('BTC/USDT · HITECHTRADE ENGINE', 8, 22);

        ctx.restore();
      }

      if (visibleCandles.length === 0) {
        ctx.restore();
        return;
      }

      // Compute price range including Bollinger bands
      let minP = Infinity;
      let maxP = -Infinity;
      let maxVol = 1;
      for (let i = 0; i < visibleCandles.length; i++) {
        const c = visibleCandles[i];
        if (c.low < minP) minP = c.low;
        if (c.high > maxP) maxP = c.high;
        if (c.volume > maxVol) maxVol = c.volume;
        if (showOverlays) {
          if (bollingerSeries.lower[i] !== undefined && bollingerSeries.lower[i] < minP) {
            minP = bollingerSeries.lower[i];
          }
          if (bollingerSeries.upper[i] !== undefined && bollingerSeries.upper[i] > maxP) {
            maxP = bollingerSeries.upper[i];
          }
        }
      }
      if (currentPrice < minP) minP = currentPrice;
      if (currentPrice > maxP) maxP = currentPrice;

      const pad = Math.max(10, (maxP - minP) * 0.12);
      minP -= pad;
      maxP += pad;
      const priceSpan = Math.max(1, maxP - minP);

      const yForPrice = (p: number) => topPad + ((maxP - p) / priceSpan) * priceAreaH;
      const curY = Math.max(topPad + 10, Math.min(topPad + priceAreaH - 10, yForPrice(currentPrice)));

      // 2. Dashed Horizontal Gridlines & Price Axis Labels
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.09)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.font = `${isCompact ? '10.5px' : '11px'} "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';

      const gridRows = 5;
      for (let i = 0; i <= gridRows; i++) {
        const y = topPad + (priceAreaH / gridRows) * i;
        const priceVal = maxP - (priceSpan / gridRows) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(plotW, y);
        ctx.stroke();
        const overlapsBadge = y >= curY - 18 && y <= curY + 38;
        if (!overlapsBadge) {
          ctx.fillText(priceVal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' '), plotW + 6, y + 4);
        }
      }

      // Dashed vertical line at active last candle
      const slotW = (plotW - leftPad - 10) / Math.max(visibleCandles.length, 1);
      const lastCx = leftPad + (visibleCandles.length - 1) * slotW + slotW / 2;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.beginPath();
      ctx.moveTo(lastCx, topPad);
      ctx.lineTo(lastCx, H - bottomAxisH);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Candlesticks & Bottom Volume Bars
      const bodyW = Math.max(4, Math.min(12, slotW * 0.64));

      visibleCandles.forEach((c, idx) => {
        const cx = leftPad + idx * slotW + slotW / 2;
        const isUp = c.close >= c.open;
        const color = isUp ? '#00D4AA' : '#F43F5E';

        const yHigh = yForPrice(c.high);
        const yLow = yForPrice(c.low);
        const yOpen = yForPrice(c.open);
        const yClose = yForPrice(c.close);

        // Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx, yHigh);
        ctx.lineTo(cx, yLow);
        ctx.stroke();

        // Body
        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
        ctx.fillStyle = color;
        ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, bodyHeight);

        // Compact Volume Bar along bottom
        const vBarH = Math.max(3, (c.volume / maxVol) * volH);
        const vTop = H - bottomAxisH - vBarH;
        ctx.fillStyle = isUp ? 'rgba(0, 212, 170, 0.72)' : 'rgba(244, 63, 94, 0.72)';
        ctx.fillRect(cx - bodyW / 2, vTop, bodyW, vBarH);

        // X-axis timestamp every ~7 candles
        const step = isCompact ? 8 : 6;
        if (idx % step === 2 && idx < visibleCandles.length - 1) {
          const dt = new Date(c.timestamp);
          const label = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
          ctx.fillStyle = '#64748b';
          ctx.font = '10px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(label, cx, H - 6);
        }
      });

      // 4. Bollinger Outer Envelope + EMA 5 (Cyan) & EMA 10 (Magenta) Overlays
      if (showOverlays && visibleCandles.length > 2) {
        const drawLine = (series: number[], stroke: string, width: number) => {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = width;
          ctx.beginPath();
          series.forEach((val, idx) => {
            const cx = leftPad + idx * slotW + slotW / 2;
            const cy = yForPrice(val);
            if (idx === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
          });
          ctx.stroke();
        };
        drawLine(bollingerSeries.upper, 'rgba(56, 189, 248, 0.52)', 1.15);
        drawLine(bollingerSeries.lower, 'rgba(56, 189, 248, 0.52)', 1.15);
        drawLine(visibleEma5, '#0EA5E9', 1.85);
        drawLine(visibleEma10, '#EC4899', 1.85);
      }

      // 5. Current Live Price Line + Badge + Countdown Pill (Kaizenfin Signature)
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, curY);
      ctx.lineTo(plotW, curY);
      ctx.stroke();

      // Price tag box
      const badgeX = plotW + 3;
      const badgeW = rightAxisW - 6;
      ctx.fillStyle = '#0EA5E9';
      ctx.beginPath();
      ctx.roundRect(badgeX, curY - 11, badgeW, 21, 5);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 ${isCompact ? '10px' : '11px'} "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(currentPrice.toFixed(2), badgeX + badgeW / 2, curY + 3);

      // Countdown box below price tag
      ctx.fillStyle = phase === 'betting' ? '#0EA5E9' : '#2563EB';
      ctx.beginPath();
      ctx.roundRect(badgeX + 6, curY + 13, badgeW - 12, 19, 5);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 ${isCompact ? '10px' : '10.5px'} "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText(`00:${String(secondsRemaining).padStart(2, '0')}`, badgeX + badgeW / 2, curY + 26);

      // 6. Interactive Crosshair
      if (mousePos && mousePos.x < plotW && mousePos.y > topPad && mousePos.y < H - bottomAxisH) {
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.28)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(mousePos.x, topPad);
        ctx.lineTo(mousePos.x, H - bottomAxisH);
        ctx.moveTo(0, mousePos.y);
        ctx.lineTo(plotW, mousePos.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(container);
    return () => ro.disconnect();
  }, [
    visibleCandles,
    visibleEma5,
    visibleEma10,
    bollingerSeries,
    currentPrice,
    secondsRemaining,
    phase,
    showOverlays,
    mousePos,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || visibleCandles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const isCompact = rect.width < 640;
    const rightAxisW = isCompact ? 68 : 76;
    const leftPad = isCompact ? 20 : 14;
    const plotW = Math.max(100, rect.width - rightAxisW);
    if (x >= leftPad && x <= plotW - 10) {
      const slotW = (plotW - leftPad - 10) / visibleCandles.length;
      const idx = Math.floor((x - leftPad) / slotW);
      if (idx >= 0 && idx < visibleCandles.length) {
        setHoverIdx(idx);
        return;
      }
    }
    setHoverIdx(null);
  };

  return (
    <div
      ref={containerRef}
      data-watermark="hitechtrade"
      className="relative h-[305px] sm:h-[360px] lg:h-[440px] w-full overflow-hidden border-y border-slate-800/80 bg-[#070b16] lg:rounded-xl lg:border"
    >
      {/* Floating Compact Pair Pill — Kaizenfin Style (replaces bulky top pair card) */}
      <div className="absolute left-2.5 top-2 z-20 flex flex-col items-start gap-1.5">
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700/60 bg-[#171d2f]/95 px-2.5 py-1.5 shadow-md backdrop-blur-sm">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500 text-[11px] font-black text-white">
            ₿
          </span>
          <span className="font-display text-xs sm:text-sm font-extrabold tracking-tight text-white">
            BTC/USDT
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowOverlays((v) => !v)}
          title="Bật/Tắt chỉ báo EMA & Bollinger"
          aria-label="Bật/Tắt chỉ báo trên biểu đồ"
          className={`inline-flex items-center justify-center rounded-md border px-2 py-1 transition-colors cursor-pointer ${
            showOverlays
              ? 'border-[#00D4AA]/40 bg-[#00D4AA]/15 text-[#00D4AA]'
              : 'border-slate-700 bg-slate-900/80 text-slate-400'
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Left-Edge Vertical Traders Sentiment Gauge (Visible on Mobile/Tablet like Kaizenfin) */}
      <div
        aria-label="Tâm lý giao dịch"
        className="pointer-events-none absolute left-2.5 top-[27%] bottom-[16%] z-10 flex flex-col items-start justify-between xl:hidden"
      >
        <span className="font-mono text-[11px] font-bold text-[#00D4AA] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          {sentimentBuyPct}%
        </span>
        <div className="my-1 ml-0.5 flex w-1.5 flex-1 flex-col overflow-hidden rounded-full bg-slate-800/80">
          <div
            className="w-full bg-[#00D4AA] transition-all duration-300"
            style={{ height: `${sentimentBuyPct}%` }}
          />
          <div
            className="w-full bg-rose-500 transition-all duration-300"
            style={{ height: `${sentimentSellPct}%` }}
          />
        </div>
        <span className="font-mono text-[11px] font-bold text-rose-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          {sentimentSellPct}%
        </span>
      </div>

      {/* Desktop OHLCV HUD (Hidden on compact mobile so chart stays clean like Kaizenfin) */}
      {activeHoverCandle && (
        <div className="pointer-events-none absolute left-[138px] top-3 z-10 hidden md:flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] font-mono">
          <span className="text-slate-400">
            O: <strong className="text-slate-100">{activeHoverCandle.open.toFixed(2)}</strong>
          </span>
          <span className="text-slate-400">
            H: <strong className="text-[#00D4AA]">{activeHoverCandle.high.toFixed(2)}</strong>
          </span>
          <span className="text-slate-400">
            L: <strong className="text-rose-400">{activeHoverCandle.low.toFixed(2)}</strong>
          </span>
          <span className="text-slate-400">
            C: <strong className="text-slate-100">{activeHoverCandle.close.toFixed(2)}</strong>
          </span>
          <span className="hidden lg:inline text-slate-500">
            Vol: <strong className="text-sky-300">{activeHoverCandle.volume.toFixed(2)}</strong>
          </span>
        </div>
      )}

      {/* Desktop Top-Right Compact Chart Toolbar */}
      <div className="absolute right-20 top-2.5 z-10 hidden sm:flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowOverlays((v) => !v)}
          title="Bật/Tắt đường EMA & Bollinger"
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
            showOverlays
              ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
              : 'border-slate-700 bg-slate-900/80 text-slate-400'
          }`}
        >
          {showOverlays ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          <span>EMA</span>
        </button>
        <button
          type="button"
          onClick={() => setVisibleCount((c) => Math.max(18, c - 6))}
          aria-label="Phóng to biểu đồ"
          className="rounded-md border border-slate-700/80 bg-slate-900/80 p-1 text-slate-300 hover:text-white cursor-pointer"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setVisibleCount((c) => Math.min(56, c + 6))}
          aria-label="Thu nhỏ biểu đồ"
          className="rounded-md border border-slate-700/80 bg-slate-900/80 p-1 text-slate-300 hover:text-white cursor-pointer"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
      </div>

      <canvas
        ref={canvasRef}
        data-testid="btc-candlestick-canvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHoverIdx(null);
          setMousePos(null);
        }}
        className="block h-full w-full cursor-crosshair"
      />
    </div>
  );
};
