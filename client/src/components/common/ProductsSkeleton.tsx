import React from "react";
import Shimmer from "../Shimmer";

const ProductsSkeleton: React.FC = () => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
      gap: "1rem",
    }}
  >
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        style={{
          background: "var(--color-surface)",
          borderRadius: "12px",
          padding: "0.5rem",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <Shimmer className="rounded" style={{ height: 120 }} />
        <Shimmer style={{ height: 16, marginTop: 8 }} />
        <Shimmer style={{ height: 14, marginTop: 4, width: "60%" }} />
      </div>
    ))}
  </div>
);

export default ProductsSkeleton;
