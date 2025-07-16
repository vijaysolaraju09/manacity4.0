import React from 'react';
import './Shimmer.scss';

interface ShimmerProps {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
  className?: string;
}

const Shimmer: React.FC<ShimmerProps> = ({ width, height, style, className = '' }) => {
  return (
    <div
      className={`shimmer ${className}`.trim()}
      style={{ width, height, ...style }}
    />
  );
};

export default Shimmer;
