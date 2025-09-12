import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type TimeFrame = "15m" | "1H" | "4H" | "1D" | "1W";

interface Props {
  pairSymbol: string;
}

/*
ChartSection owns:
- selectedTimeFrame state
- generateChartData and memoized chartData
- chart options and tooltip logic
This keeps heavy chart logic local and avoids re-rendering unrelated UI.
*/

export default function ChartSection({ pairSymbol }: Props) {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>("1H");

  const generateChartData = (timeframe: TimeFrame) => {
    const now = Date.now();
    const intervals: Record<TimeFrame, number> = {
      "15m": 15 * 60 * 1000,
      "1H": 60 * 60 * 1000,
      "4H": 4 * 60 * 60 * 1000,
      "1D": 24 * 60 * 60 * 1000,
      "1W": 7 * 24 * 60 * 60 * 1000,
    };

    const interval = intervals[timeframe];
    const dataPoints =
      timeframe === "15m"
        ? 96
        : timeframe === "1H"
        ? 24
        : timeframe === "4H"
        ? 6
        : timeframe === "1D"
        ? 30
        : 52;

    const candlestick: { x: number; y: number[] }[] = [];
    const volume: { x: number; y: number }[] = [];

    const basePrice = 220;
    const targetPrice = 240;
    const priceIncrement = (targetPrice - basePrice) / dataPoints;

    for (let i = 0; i < dataPoints; i++) {
      const timestamp = now - (dataPoints - i) * interval;
      const open = basePrice + i * priceIncrement + (Math.random() - 0.5) * 2;
      const volatility = 3 + Math.random() * 2;
      const high = open + Math.random() * volatility;
      const low = open - Math.random() * volatility;
      const close =
        open + (Math.random() - 0.45) * volatility + priceIncrement * 0.8;

      candlestick.push({
        x: timestamp,
        y: [
          Number(open.toFixed(2)),
          Number(high.toFixed(2)),
          Number(low.toFixed(2)),
          Number(close.toFixed(2)),
        ],
      });
      volume.push({
        x: timestamp,
        y: Math.floor(50000 + Math.random() * 200000),
      });
    }

    return { candlestick, volume };
  };

  const chartData = useMemo(
    () => generateChartData(selectedTimeFrame),
    [selectedTimeFrame]
  );

  const candlestickOptions = useMemo(
    () => ({
      chart: {
        type: "candlestick" as const,
        height: 400,
        background: "transparent",
        toolbar: { show: true },
        zoom: { enabled: true, type: "x" as const, autoScaleYaxis: true },
      },
      theme: { mode: "dark" as const },
      plotOptions: {
        candlestick: {
          colors: { upward: "#14f195", downward: "#ff4757" },
          wick: { useFillColor: true },
        },
      },
      xaxis: {
        type: "datetime" as const,
        labels: { style: { colors: "#94a3b8" } },
        axisBorder: { color: "#374151" },
        axisTicks: { color: "374151" },
      },
      yaxis: {
        labels: {
          style: { colors: "#94a3b8" },
          formatter: (val: number) => `$${val.toFixed(2)}`,
        },
      },
      grid: { borderColor: "#374151", strokeDashArray: 3 },
      tooltip: {
        theme: "dark",
        custom: function ({ seriesIndex, dataPointIndex, w }: any) {
          const o = w.globals.seriesCandleO[seriesIndex][dataPointIndex];
          const h = w.globals.seriesCandleH[seriesIndex][dataPointIndex];
          const l = w.globals.seriesCandleL[seriesIndex][dataPointIndex];
          const c = w.globals.seriesCandleC[seriesIndex][dataPointIndex];
          return `\n <div class="bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm">\n <div class="text-gray-300 mb-2">OHLC</div>\n <div class="grid grid-cols-2 gap-2 text-xs">\n <div>Open: <span class="text-blue-400">$${o?.toFixed(
            2
          )}</span></div>\n <div>High: <span class="text-green-400">$${h?.toFixed(
            2
          )}</span></div>\n <div>Low: <span class="text-red-400">$${l?.toFixed(
            2
          )}</span></div>\n <div>Close: <span class="text-purple-400">$${c?.toFixed(
            2
          )}</span></div>\n </div>\n </div>\n `;
        },
      },
    }),
    []
  );

  const volumeOptions = useMemo(
    () => ({
      chart: {
        type: "bar" as const,
        height: 120,
        background: "transparent",
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      theme: { mode: "dark" as const },
      plotOptions: {
        bar: {
          columnWidth: "80%",
          colors: { ranges: [{ from: 0, to: 100000000, color: "#9945ff" }] },
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        type: "datetime" as const,
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: "#94a3b8" },
          formatter: (val: number) => `${(val / 1000).toFixed(0)}K`,
        },
      },
      grid: {
        borderColor: "#374151",
        strokeDashArray: 3,
        xaxis: { lines: { show: false } },
      },
      tooltip: {
        theme: "dark",
        y: { formatter: (val: number) => `${val.toLocaleString()} SOL` },
      },
    }),
    []
  );

  const timeFrames: TimeFrame[] = ["15m", "1H", "4H", "1D", "1W"];

  return (
    <div className="bg-gray-800/60 backdrop-blur-md rounded-xl border border-gray-700/50 p-6">
      <div className="flex space-x-2 mb-6">
        {timeFrames.map((tf) => (
          <button
            key={tf}
            onClick={() => setSelectedTimeFrame(tf)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedTimeFrame === tf
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <Chart
          options={candlestickOptions}
          series={[{ name: pairSymbol, data: chartData.candlestick }]}
          type="candlestick"
          height={400}
        />
      </div>

      <Chart
        options={volumeOptions}
        series={[{ name: "Volume", data: chartData.volume }]}
        type="bar"
        height={120}
      />
    </div>
  );
}
