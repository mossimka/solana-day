import React, { useState } from "react";

interface PairData {
  currentPrice: number;
}

export default function QuickTradePanel({ pairData }: { pairData: PairData }) {
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
    <div className="glass p-6">
      <h2 className="text-xl font-bold mb-6" style={{color: 'var(--color-text-primary)'}}>Quick Trade</h2>

      <div className="flex rounded-lg p-1 mb-6" style={{backgroundColor: 'var(--color-bg-secondary)'}}>
        {(["Buy", "Sell"] as const).map((side) => (
          <button
            key={side}
            onClick={() => setOrderSide(side)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              orderSide === side
                ? side === "Buy"
                  ? "bg-green-600 text-white"
                  : "bg-red-600 text-white"
                : "hover:opacity-80"
            }`}
            style={{
              color: orderSide === side ? '#ffffff' : 'var(--color-text-secondary)'
            }}
          >
            {side}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-2" style={{color: 'var(--color-text-secondary)'}}>Order Type</label>
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as "Market" | "Limit" | "Stop")}
          className="w-full rounded-lg px-3 py-2 focus:outline-none"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)'
          }}
        >
          <option value="Market">Market</option>
          <option value="Limit">Limit</option>
          <option value="Stop">Stop</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-2" style={{color: 'var(--color-text-secondary)'}}>Amount (SOL)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full rounded-lg px-3 py-2 focus:outline-none"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)'
          }}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-2" style={{color: 'var(--color-text-secondary)'}}>Price (USDC)</label>
        <input
          type={orderType === "Market" ? "text" : "number"}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={orderType === "Market" ? "Market" : "0.00"}
          disabled={orderType === "Market"}
          className="w-full rounded-lg px-3 py-2 focus:outline-none disabled:opacity-50"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)'
          }}
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm mb-2" style={{color: 'var(--color-text-secondary)'}}>
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
        <div className="mt-4 p-3 rounded-lg text-sm" style={{backgroundColor: 'var(--color-bg-secondary)', opacity: 0.7}}>
          <div className="mb-2" style={{color: 'var(--color-text-secondary)'}}>Order Preview:</div>
          <div className="flex justify-between">
            <span>Estimated Total:</span>
            <span style={{color: 'var(--color-text-primary)'}}>
              {orderType === "Market"
                ? `$${(Number(amount) * pairData.currentPrice).toFixed(2)}`
                : `$${(Number(amount) * Number(price || 0)).toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Estimated Fee:</span>
            <span style={{color: 'var(--color-text-primary)'}}>$2.50</span>
          </div>
        </div>
      )}
    </div>
  );
}
