import React from "react";
import Shimmer from "../Shimmer";

const EventsSkeleton: React.FC = () => (
  <div className="event-list">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        style={{
          background: "var(--color-surface)",
          borderRadius: "12px",
          padding: "1rem",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <Shimmer className="rounded" style={{ height: 140 }} />
        <Shimmer style={{ height: 16, marginTop: 8, width: "70%" }} />
        <Shimmer style={{ height: 14, marginTop: 4, width: "40%" }} />
      </div>
    ))}
  </div>
);

export default EventsSkeleton;
