import React from "react";
import Shimmer from "../Shimmer";

const ShopsSkeleton: React.FC = () => (
  <div style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
    gap: "1rem",
  }}>
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
        <Shimmer className="rounded" style={{ height: 160 }} />
        <Shimmer style={{ height: 16, marginTop: 8 }} />
        <Shimmer style={{ height: 14, marginTop: 4, width: "60%" }} />
      </div>
    ))}
  </div>
);

export default ShopsSkeleton;
