"use client";
import React, { useEffect, useMemo, useState } from "react";
import { liquidityApi } from "../api/liquidityService";
import type { ValidPair } from "../types";

interface PairSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (pair: ValidPair) => void;
}

export const PairSelectorModal: React.FC<PairSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [pairs, setPairs] = useState<ValidPair[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await liquidityApi.getValidPairs();
        if (mounted) setPairs(data || []);
      } catch {
        setError("Failed to load pairs");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const filtered = useMemo(
    () =>
      pairs.filter((p) =>
        `${p.baseMint}/${p.quoteMint}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [pairs, search]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Select trading pair"
      onClick={onClose}
    >
      <div
        className="bg-[var(--glass-bg)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 flex items-center justify-between border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold">Select Trading Pair</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-sm px-2 py-1 rounded hover:bg-[var(--color-surface-hover)] transition"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search (e.g. SOL/USDC)"
            className="w-full bg-transparent border border-[var(--color-border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] transition"
          />
          {loading && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Loading pairs…
            </p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!loading && !error && (
            <ul className="space-y-1">
              {filtered.map((p) => (
                <li key={p.poolId}>
                  <button
                    onClick={() => {
                      onSelect(p);
                      onClose();
                    }}
                    className="w-full flex justify-between items-center text-left px-3 py-2 rounded border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition text-sm"
                  >
                    <span>
                      {p.baseMint}/{p.quoteMint}
                    </span>
                    <span className="text-[var(--color-text-secondary)] text-xs">
                      {p.poolId.slice(0, 6)}…
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="text-sm text-[var(--color-text-secondary)]">
                  No matches
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
