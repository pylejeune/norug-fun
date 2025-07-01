"use client";

import { useEffect, useRef } from "react";

interface TradingViewChartProps {
  symbol?: string;
  height?: number;
  width?: string | number;
  className?: string;
}

export function TradingViewChart({
  symbol = "BINANCE:SOLUSDT",
  height = 400,
  width = "100%",
  className = "",
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "BINANCE:SOLUSDT",
      interval: "15",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      backgroundColor: "rgba(19, 23, 34, 1)",
      gridColor: "rgba(42, 46, 57, 0.5)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return (
    <div className={`w-full ${className}`}>
      <div
        ref={containerRef}
        style={{ height: `${height}px`, width: width }}
        className="rounded-lg overflow-hidden border border-gray-700"
      />
    </div>
  );
}
