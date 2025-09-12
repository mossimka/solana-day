"use client";

import React from "react";
import PairHeader from "./components/PairHeader";
import ChartSection from "./components/ChartSection";
import PositionsSection from "./components/PositionSection";
import QuickTradePanel from "./components/QuickTradePanel";
import PortfolioSummary from "./components/PortfolioSummary";
import WalletInfo from "./components/WalletInfo";

// Shared types (can be extracted into types.ts if you prefer)
export type TimeFrame = "15m" | "1H" | "4H" | "1D" | "1W";

export interface Position {
  id: string;
  type: string;
  pnl: number;
  lpPositionSize: number;
  priceRange: string;
  entryDate: string;
  status: string;
}

export interface Trade {
  pair: string;
  type: string;
  entry: number;
  pnl: number;
  timeAgo: string;
}

export interface WalletInfo {
  address: string;
  solBalance: number;
  usdcBalance: number;
  totalValue: number;
  dailyChange: number;
}

export default function TradingView() {
  // MOCK DATA: parent holds only the domain/model data and passes it down as props.
  const pairData = {
    symbol: "SOL/USDC",
    currentPrice: 240.0,
    change24h: 12.5,
    changeAmount: 26.85,
    high24h: 245.32,
    low24h: 228.17,
    volume: 2847293,
  };

  const activePosition: Position = {
    id: "74hc259KxZeE...",
    type: "DELTA NEUTRAL",
    pnl: 3199,
    lpPositionSize: 211.78,
    priceRange: "0.1805 - 0.2207",
    entryDate: "2 days ago",
    status: "Active",
  };

  const walletInfo: WalletInfo = {
    address: "5sdtjA...PRNjKL",
    solBalance: 45.2,
    usdcBalance: 2847.5,
    totalValue: 15847.32,
    dailyChange: 8.4,
  };

  const recentTrades: Trade[] = [
    {
      pair: "WLFI/USDT",
      type: "Hedge",
      entry: 0.1973,
      pnl: 3173,
      timeAgo: "1 hour ago",
    },
    {
      pair: "SOL",
      type: "Long Position",
      entry: 235.5,
      pnl: -156,
      timeAgo: "3 hours ago",
    },
    {
      pair: "SOL/USDC",
      type: "LP",
      entry: 232.15,
      pnl: 892,
      timeAgo: "6 hours ago",
    },
  ];

  return (
    <main className="min-h-screen flex items-center justify-center relative bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 pt-40">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Pair header (pure presentation) */}
          <PairHeader pairData={pairData} />

          {/* Chart section (owns timeframe & chart logic) */}
          <ChartSection pairSymbol={pairData.symbol} />

          {/* Positions and recent trades */}
          <PositionsSection
            activePosition={activePosition}
            recentTrades={recentTrades}
          />
        </div>

        <div className="space-y-6">
          {/* Quick trade form (owns its own inputs/state) */}
          <QuickTradePanel pairData={pairData} />

          <PortfolioSummary walletInfo={walletInfo} />

          <WalletInfo walletInfo={walletInfo} />
        </div>
      </div>
    </main>
  );
}

// import React, { useState, useMemo } from "react";
// import dynamic from "next/dynamic";
// import {
//   TrendingUp,
//   TrendingDown,
//   Wallet,
//   Activity,
//   Settings,
//   MoreHorizontal,
// } from "lucide-react";

// // Dynamically import ApexCharts to avoid SSR issues
// const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

// // Types for our data structures
// interface CandlestickData {
//   x: number;
//   y: [number, number, number, number]; // [open, high, low, close]
// }

// interface VolumeData {
//   x: number;
//   y: number;
// }

// interface Position {
//   id: string;
//   type: string;
//   pnl: number;
//   lpPositionSize: number;
//   priceRange: string;
//   entryDate: string;
//   status: string;
// }

// interface Trade {
//   pair: string;
//   type: string;
//   entry: number;
//   pnl: number;
//   timeAgo: string;
// }

// interface WalletInfo {
//   address: string;
//   solBalance: number;
//   usdcBalance: number;
//   totalValue: number;
//   dailyChange: number;
// }

// type TimeFrame = "15m" | "1H" | "4H" | "1D" | "1W";

// export default function TradingView() {
//   // State management
//   const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>("1H");
//   const [orderType, setOrderType] = useState<"Market" | "Limit" | "Stop">(
//     "Market"
//   );
//   const [orderSide, setOrderSide] = useState<"Buy" | "Sell">("Buy");
//   const [amount, setAmount] = useState<string>("");
//   const [price, setPrice] = useState<string>("Market");
//   const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);

//   // Mock data
//   const pairData = {
//     symbol: "SOL/USDC",
//     currentPrice: 240.0,
//     change24h: 12.5,
//     changeAmount: 26.85,
//     high24h: 245.32,
//     low24h: 228.17,
//     volume: 2847293,
//   };

//   const activePosition: Position = {
//     id: "74hc259KxZeE...",
//     type: "DELTA NEUTRAL",
//     pnl: 3199,
//     lpPositionSize: 211.78,
//     priceRange: "0.1805 - 0.2207",
//     entryDate: "2 days ago",
//     status: "Active",
//   };

//   const walletInfo: WalletInfo = {
//     address: "5sdtjA...PRNjKL",
//     solBalance: 45.2,
//     usdcBalance: 2847.5,
//     totalValue: 15847.32,
//     dailyChange: 8.4,
//   };

//   const recentTrades: Trade[] = [
//     {
//       pair: "WLFI/USDT",
//       type: "Hedge",
//       entry: 0.1973,
//       pnl: 3173,
//       timeAgo: "1 hour ago",
//     },
//     {
//       pair: "SOL",
//       type: "Long Position",
//       entry: 235.5,
//       pnl: -156,
//       timeAgo: "3 hours ago",
//     },
//     {
//       pair: "SOL/USDC",
//       type: "LP",
//       entry: 232.15,
//       pnl: 892,
//       timeAgo: "6 hours ago",
//     },
//   ];

//   // Generate realistic OHLCV data showing upward trend from $220 to $240
//   const generateChartData = (
//     timeframe: TimeFrame
//   ): { candlestick: CandlestickData[]; volume: VolumeData[] } => {
//     const now = Date.now();
//     const intervals = {
//       "15m": 15 * 60 * 1000,
//       "1H": 60 * 60 * 1000,
//       "4H": 4 * 60 * 60 * 1000,
//       "1D": 24 * 60 * 60 * 1000,
//       "1W": 7 * 24 * 60 * 60 * 1000,
//     };

//     const interval = intervals[timeframe];
//     const dataPoints =
//       timeframe === "15m"
//         ? 96
//         : timeframe === "1H"
//         ? 24
//         : timeframe === "4H"
//         ? 6
//         : timeframe === "1D"
//         ? 30
//         : 52;

//     const candlestick: CandlestickData[] = [];
//     const volume: VolumeData[] = [];

//     const basePrice = 220;
//     const targetPrice = 240;
//     const priceIncrement = (targetPrice - basePrice) / dataPoints;

//     for (let i = 0; i < dataPoints; i++) {
//       const timestamp = now - (dataPoints - i) * interval;
//       const open = basePrice + i * priceIncrement + (Math.random() - 0.5) * 2;
//       const volatility = 3 + Math.random() * 2;
//       const high = open + Math.random() * volatility;
//       const low = open - Math.random() * volatility;
//       const close =
//         open + (Math.random() - 0.45) * volatility + priceIncrement * 0.8;

//       candlestick.push({
//         x: timestamp,
//         y: [
//           Number(open.toFixed(2)),
//           Number(high.toFixed(2)),
//           Number(low.toFixed(2)),
//           Number(close.toFixed(2)),
//         ],
//       });

//       volume.push({
//         x: timestamp,
//         y: Math.floor(50000 + Math.random() * 200000),
//       });
//     }

//     return { candlestick, volume };
//   };

//   const chartData = useMemo(
//     () => generateChartData(selectedTimeFrame),
//     [selectedTimeFrame]
//   );

//   // Chart configuration
//   const candlestickOptions = {
//     chart: {
//       type: "candlestick" as const,
//       height: 400,
//       background: "transparent",
//       toolbar: {
//         show: true,
//         tools: {
//           download: true,
//           selection: true,
//           zoom: true,
//           zoomin: true,
//           zoomout: true,
//           pan: true,
//           reset: true,
//         },
//       },
//       zoom: {
//         enabled: true,
//         type: "x" as const,
//         autoScaleYaxis: true,
//       },
//     },
//     theme: {
//       mode: "dark" as const,
//     },
//     plotOptions: {
//       candlestick: {
//         colors: {
//           upward: "#14f195",
//           downward: "#ff4757",
//         },
//         wick: {
//           useFillColor: true,
//         },
//       },
//     },
//     xaxis: {
//       type: "datetime" as const,
//       labels: {
//         style: {
//           colors: "#94a3b8",
//         },
//       },
//       axisBorder: {
//         color: "#374151",
//       },
//       axisTicks: {
//         color: "#374151",
//       },
//     },
//     yaxis: {
//       labels: {
//         style: {
//           colors: "#94a3b8",
//         },
//         formatter: (val: number) => `$${val.toFixed(2)}`,
//       },
//     },
//     grid: {
//       borderColor: "#374151",
//       strokeDashArray: 3,
//     },
//     tooltip: {
//       theme: "dark",
//       custom: function ({
//         seriesIndex,
//         dataPointIndex,
//         w,
//       }: {
//         seriesIndex: number;
//         dataPointIndex: number;
//         w: {
//           globals: {
//             seriesCandleO: number[][];
//             seriesCandleH: number[][];
//             seriesCandleL: number[][];
//             seriesCandleC: number[][];
//           };
//         };
//       }) {
//         const o = w.globals.seriesCandleO[seriesIndex][dataPointIndex];
//         const h = w.globals.seriesCandleH[seriesIndex][dataPointIndex];
//         const l = w.globals.seriesCandleL[seriesIndex][dataPointIndex];
//         const c = w.globals.seriesCandleC[seriesIndex][dataPointIndex];

//         return `
//           <div class="bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm">
//             <div class="text-gray-300 mb-2">OHLC</div>
//             <div class="grid grid-cols-2 gap-2 text-xs">
//               <div>Open: <span class="text-blue-400">$${o?.toFixed(
//                 2
//               )}</span></div>
//               <div>High: <span class="text-green-400">$${h?.toFixed(
//                 2
//               )}</span></div>
//               <div>Low: <span class="text-red-400">$${l?.toFixed(
//                 2
//               )}</span></div>
//               <div>Close: <span class="text-purple-400">$${c?.toFixed(
//                 2
//               )}</span></div>
//             </div>
//           </div>
//         `;
//       },
//     },
//   };

//   const volumeOptions = {
//     chart: {
//       type: "bar" as const,
//       height: 120,
//       background: "transparent",
//       toolbar: { show: false },
//       zoom: { enabled: false },
//     },
//     theme: {
//       mode: "dark" as const,
//     },
//     plotOptions: {
//       bar: {
//         columnWidth: "80%",
//         colors: {
//           ranges: [
//             {
//               from: 0,
//               to: 100000000,
//               color: "#9945ff",
//             },
//           ],
//         },
//       },
//     },
//     dataLabels: {
//       enabled: false,
//     },
//     xaxis: {
//       type: "datetime" as const,
//       labels: { show: false },
//       axisBorder: { show: false },
//       axisTicks: { show: false },
//     },
//     yaxis: {
//       labels: {
//         style: {
//           colors: "#94a3b8",
//         },
//         formatter: (val: number) => `${(val / 1000).toFixed(0)}K`,
//       },
//     },
//     grid: {
//       borderColor: "#374151",
//       strokeDashArray: 3,
//       xaxis: { lines: { show: false } },
//     },
//     tooltip: {
//       theme: "dark",
//       y: {
//         formatter: (val: number) => `${val.toLocaleString()} SOL`,
//       },
//     },
//   };

//   const timeFrames: TimeFrame[] = ["15m", "1H", "4H", "1D", "1W"];

//   const handlePlaceOrder = () => {
//     // Mock order placement
//     alert(
//       `${orderSide} order placed: ${amount} SOL at ${
//         price === "Market" ? "Market Price" : `$${price}`
//       }`
//     );
//   };

//   return (
//     <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
//       <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
//         {/* Left Column - Chart Section (70%) */}
//         <div className="lg:col-span-3 space-y-6">
//           {/* Pair Info Header */}
//           <div className="bg-gray-800/60 backdrop-blur-md rounded-xl border border-gray-700/50 p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <h1 className="text-2xl font-bold text-white mb-2">
//                   {pairData.symbol}
//                 </h1>
//                 <div className="flex items-center space-x-6">
//                   <div className="text-3xl font-bold text-white">
//                     ${pairData.currentPrice.toFixed(2)}
//                   </div>
//                   <div
//                     className={`flex items-center space-x-1 ${
//                       pairData.change24h >= 0
//                         ? "text-green-400"
//                         : "text-red-400"
//                     }`}
//                   >
//                     {pairData.change24h >= 0 ? (
//                       <TrendingUp size={20} />
//                     ) : (
//                       <TrendingDown size={20} />
//                     )}
//                     <span className="font-semibold">
//                       +{pairData.change24h}% (+${pairData.changeAmount})
//                     </span>
//                   </div>
//                 </div>
//               </div>
//               <div className="text-right space-y-1 text-sm">
//                 <div className="text-gray-400">
//                   24h High:{" "}
//                   <span className="text-green-400">${pairData.high24h}</span>
//                 </div>
//                 <div className="text-gray-400">
//                   24h Low:{" "}
//                   <span className="text-red-400">${pairData.low24h}</span>
//                 </div>
//                 <div className="text-gray-400">
//                   Volume:{" "}
//                   <span className="text-purple-400">
//                     {pairData.volume.toLocaleString()} SOL
//                   </span>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Chart Container */}
//           <div className="bg-gray-800/60 backdrop-blur-md rounded-xl border border-gray-700/50 p-6">
//             {/* Timeframe Buttons */}
//             <div className="flex space-x-2 mb-6">
//               {timeFrames.map((tf) => (
//                 <button
//                   key={tf}
//                   onClick={() => setSelectedTimeFrame(tf)}
//                   className={`px-4 py-2 rounded-lg font-medium transition-all ${
//                     selectedTimeFrame === tf
//                       ? "bg-purple-600 text-white shadow-lg"
//                       : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
//                   }`}
//                 >
//                   {tf}
//                 </button>
//               ))}
//             </div>

//             {/* Price Chart */}
//             <div className="mb-4">
//               <Chart
//                 options={candlestickOptions}
//                 series={[{ name: "SOL/USDC", data: chartData.candlestick }]}
//                 type="candlestick"
//                 height={400}
//               />
//             </div>

//             {/* Volume Chart */}
//             <Chart
//               options={volumeOptions}
//               series={[{ name: "Volume", data: chartData.volume }]}
//               type="bar"
//               height={120}
//             />
//           </div>

//           {/* Positions Section */}
//           <div className="bg-gray-800/60 backdrop-blur-md rounded-xl border border-gray-700/50 p-6">
//             <div className="flex items-center justify-between mb-6">
//               <h2 className="text-xl font-bold text-white">Active Positions</h2>
//               <Activity className="text-purple-400" size={24} />
//             </div>

//             {/* Active Position Card */}
//             <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
//               <div className="flex items-center justify-between mb-3">
//                 <div className="flex items-center space-x-3">
//                   <div className="w-3 h-3 bg-green-400 rounded-full"></div>
//                   <span className="font-medium text-white">
//                     {activePosition.id}
//                   </span>
//                   <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs font-medium">
//                     {activePosition.type}
//                   </span>
//                 </div>
//                 <div className="flex items-center space-x-2">
//                   <span className="text-green-400 font-bold">
//                     +${activePosition.pnl.toLocaleString()}
//                   </span>
//                   <button className="p-1 hover:bg-gray-600 rounded">
//                     <MoreHorizontal size={16} className="text-gray-400" />
//                   </button>
//                 </div>
//               </div>
//               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
//                 <div>
//                   <div className="text-gray-400">LP Position Size</div>
//                   <div className="text-white font-medium">
//                     ${activePosition.lpPositionSize}
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-gray-400">Price Range</div>
//                   <div className="text-white font-medium">
//                     {activePosition.priceRange}
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-gray-400">Entry Date</div>
//                   <div className="text-white font-medium">
//                     {activePosition.entryDate}
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-gray-400">Status</div>
//                   <div className="text-green-400 font-medium">
//                     {activePosition.status}
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Recent Trades */}
//             <div>
//               <h3 className="text-lg font-semibold text-white mb-3">
//                 Recent Trades
//               </h3>
//               <div className="space-y-2">
//                 {recentTrades.map((trade, index) => (
//                   <div
//                     key={index}
//                     className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg"
//                   >
//                     <div className="flex items-center space-x-3">
//                       <div className="text-white font-medium">{trade.pair}</div>
//                       <div className="text-gray-400">{trade.type}</div>
//                       <div className="text-gray-400">Entry: ${trade.entry}</div>
//                     </div>
//                     <div className="flex items-center space-x-3">
//                       <div
//                         className={`font-medium ${
//                           trade.pnl >= 0 ? "text-green-400" : "text-red-400"
//                         }`}
//                       >
//                         {trade.pnl >= 0 ? "+" : ""}${trade.pnl}
//                       </div>
//                       <div className="text-gray-500 text-sm">
//                         {trade.timeAgo}
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Right Column - Trading Sidebar (30%) */}
//         <div className="space-y-6">
//           {/* Quick Trade Panel */}
//           <div className="bg-gray-800/60 backdrop-blur-md rounded-xl border border-gray-700/50 p-6">
//             <h2 className="text-xl font-bold text-white mb-6">Quick Trade</h2>

//             {/* Buy/Sell Toggle */}
//             <div className="flex rounded-lg bg-gray-700/50 p-1 mb-6">
//               {(["Buy", "Sell"] as const).map((side) => (
//                 <button
//                   key={side}
//                   onClick={() => setOrderSide(side)}
//                   className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
//                     orderSide === side
//                       ? side === "Buy"
//                         ? "bg-green-600 text-white"
//                         : "bg-red-600 text-white"
//                       : "text-gray-300 hover:text-white"
//                   }`}
//                 >
//                   {side}
//                 </button>
//               ))}
//             </div>

//             {/* Order Type Dropdown */}
//             <div className="mb-4">
//               <label className="block text-gray-400 text-sm mb-2">
//                 Order Type
//               </label>
//               <select
//                 value={orderType}
//                 onChange={(e) =>
//                   setOrderType(e.target.value as typeof orderType)
//                 }
//                 className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
//               >
//                 <option value="Market">Market</option>
//                 <option value="Limit">Limit</option>
//                 <option value="Stop">Stop</option>
//               </select>
//             </div>

//             {/* Amount Input */}
//             <div className="mb-4">
//               <label className="block text-gray-400 text-sm mb-2">
//                 Amount (SOL)
//               </label>
//               <input
//                 type="number"
//                 value={amount}
//                 onChange={(e) => setAmount(e.target.value)}
//                 placeholder="0.00"
//                 className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
//               />
//             </div>

//             {/* Price Input */}
//             <div className="mb-4">
//               <label className="block text-gray-400 text-sm mb-2">
//                 Price (USDC)
//               </label>
//               <input
//                 type={orderType === "Market" ? "text" : "number"}
//                 value={price}
//                 onChange={(e) => setPrice(e.target.value)}
//                 placeholder={orderType === "Market" ? "Market" : "0.00"}
//                 disabled={orderType === "Market"}
//                 className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 disabled:opacity-50"
//               />
//             </div>

//             {/* Slippage Tolerance */}
//             <div className="mb-6">
//               <label className="block text-gray-400 text-sm mb-2">
//                 Slippage Tolerance: {slippageTolerance}%
//               </label>
//               <input
//                 type="range"
//                 min="0.1"
//                 max="5"
//                 step="0.1"
//                 value={slippageTolerance}
//                 onChange={(e) => setSlippageTolerance(Number(e.target.value))}
//                 className="w-full"
//               />
//             </div>

//             {/* Place Order Button */}
//             <button
//               onClick={handlePlaceOrder}
//               className={`w-full py-3 rounded-lg font-medium transition-all ${
//                 orderSide === "Buy"
//                   ? "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white"
//                   : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white"
//               }`}
//             >
//               Place {orderSide} Order
//             </button>

//             {/* Order Preview */}
//             {amount && (
//               <div className="mt-4 p-3 bg-gray-700/30 rounded-lg text-sm">
//                 <div className="text-gray-400 mb-2">Order Preview:</div>
//                 <div className="flex justify-between">
//                   <span>Estimated Total:</span>
//                   <span className="text-white">
//                     {orderType === "Market"
//                       ? `$${(Number(amount) * pairData.currentPrice).toFixed(
//                           2
//                         )}`
//                       : `$${(Number(amount) * Number(price || 0)).toFixed(2)}`}
//                   </span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span>Estimated Fee:</span>
//                   <span className="text-white">$2.50</span>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Portfolio Summary */}
//           <div className="bg-gray-800/60 backdrop-blur-md rounded-xl border border-gray-700/50 p-6">
//             <h2 className="text-xl font-bold text-white mb-6">
//               Portfolio Summary
//             </h2>

//             <div className="space-y-4">
//               <div className="flex justify-between items-center">
//                 <span className="text-gray-400">Total Value</span>
//                 <span className="text-2xl font-bold text-white">
//                   ${walletInfo.totalValue.toLocaleString()}
//                 </span>
//               </div>

//               <div className="flex justify-between items-center">
//                 <span className="text-gray-400">24h Change</span>
//                 <span className="text-green-400 font-medium">
//                   +{walletInfo.dailyChange}%
//                 </span>
//               </div>

//               <div className="border-t border-gray-700 pt-4 space-y-2">
//                 <div className="flex justify-between">
//                   <span className="text-gray-400">SOL Balance</span>
//                   <span className="text-white">
//                     {walletInfo.solBalance} SOL
//                   </span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-gray-400">USDC Balance</span>
//                   <span className="text-white">
//                     {walletInfo.usdcBalance.toLocaleString()} USDC
//                   </span>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Wallet Information */}
//           <div className="bg-gray-800/60 backdrop-blur-md rounded-xl border border-gray-700/50 p-6">
//             <div className="flex items-center justify-between mb-4">
//               <h2 className="text-xl font-bold text-white">Wallet</h2>
//               <Wallet className="text-purple-400" size={24} />
//             </div>

//             <div className="space-y-3">
//               <div>
//                 <div className="text-gray-400 text-sm">Active Wallet</div>
//                 <div className="text-white font-mono text-sm">
//                   {walletInfo.address}
//                 </div>
//               </div>

//               <div className="flex space-x-2">
//                 <button className="flex-1 bg-purple-600/20 text-purple-400 py-2 rounded-lg font-medium hover:bg-purple-600/30 transition-colors">
//                   Switch Wallet
//                 </button>
//                 <button className="p-2 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-gray-600/50 transition-colors">
//                   <Settings size={16} />
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </main>
//   );
// }
