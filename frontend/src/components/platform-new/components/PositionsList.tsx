"use client";
import React from "react";
import type { PositionWithDetails } from "../types";
import { PositionCard } from "./PositionCard";

interface PositionsListProps {
  positions: PositionWithDetails[];
  loading: boolean;
  onRemove: (p: PositionWithDetails) => void;
  onToggleRebalance: (id: string, enabled: boolean) => void;
}

export const PositionsList: React.FC<PositionsListProps> = ({
  positions,
  loading,
  onRemove,
  onToggleRebalance,
}) => {
  if (loading)
    return (
      <div className="text-sm text-[var(--color-text-secondary)]">
        Loading positions…
      </div>
    );
  if (!positions.length)
    return (
      <div className="text-sm text-[var(--color-text-secondary)]">
        No active positions.
      </div>
    );
  return (
    <div className="grid gap-4">
      {positions.map((p) => (
        <PositionCard
          key={p.positionId}
          position={p}
          onRemove={onRemove}
          onToggleRebalance={onToggleRebalance}
        />
      ))}
    </div>
  );
};
