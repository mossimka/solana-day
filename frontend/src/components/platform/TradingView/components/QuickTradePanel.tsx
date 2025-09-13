import React, { useState } from "react";

export default function QuickTradePanel({ pairData }: { pairData: any }) {
  // QuickTradePanel owns all order inputs and logic. This avoids polluting the parent with transient form state.
  const [orderType, setOrderType] = useState<"Market" | "Limit" | "Stop">(
    "Market"
  );
  const [orderSide, setOrderSide] = useState<"Buy" | "Sell">("Buy");
  const [amount, setAmount] = useState<string>("");
  const [price, setPrice] = useState<string>("Market");
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);

  const handlePlaceOrder = () => {
    alert(
      `${orderSide} order placed: ${amount} SOL at ${
        price === "Market" ? "Market Price" : `$${price}`
      }`
    );
  };

  return (
    <div className="bg-gray-800/60 backdrop-blur-md rounded-xl border border-gray-700/50 p-6">
      <h2 className="text-xl font-bold text-white mb-6">Quick Trade</h2>

      <div className="flex rounded-lg bg-gray-700/50 p-1 mb-6">
        {(["Buy", "Sell"] as const).map((side) => (
          <button
            key={side}
            onClick={() => setOrderSide(side)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              orderSide === side
                ? side === "Buy"
                  ? "bg-green-600 text-white"
                  : "bg-red-600 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            {side}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-gray-400 text-sm mb-2">Order Type</label>
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as any)}
          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
        >
          <option value="Market">Market</option>
          <option value="Limit">Limit</option>
          <option value="Stop">Stop</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-gray-400 text-sm mb-2">Amount (SOL)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-400 text-sm mb-2">Price (USDC)</label>
        <input
          type={orderType === "Market" ? "text" : "number"}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={orderType === "Market" ? "Market" : "0.00"}
          disabled={orderType === "Market"}
          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 disabled:opacity-50"
        />
      </div>

      <div className="mb-6">
        <label className="block text-gray-400 text-sm mb-2">
          Slippage Tolerance: {slippageTolerance}%
        </label>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={slippageTolerance}
          onChange={(e) => setSlippageTolerance(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <button
        onClick={handlePlaceOrder}
        className={`w-full py-3 rounded-lg font-medium transition-all ${
          orderSide === "Buy"
            ? "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white"
            : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white"
        }`}
      >
        Place {orderSide} Order
      </button>

      {amount && (
        <div className="mt-4 p-3 bg-gray-700/30 rounded-lg text-sm">
          <div className="text-gray-400 mb-2">Order Preview:</div>
          <div className="flex justify-between">
            <span>Estimated Total:</span>
            <span className="text-white">
              {orderType === "Market"
                ? `$${(Number(amount) * pairData.currentPrice).toFixed(2)}`
                : `$${(Number(amount) * Number(price || 0)).toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Estimated Fee:</span>
            <span className="text-white">$2.50</span>
          </div>
        </div>
      )}
    </div>
  );
}
