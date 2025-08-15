import React from 'react';

interface Point {
  date: string;
  value: number;
}

interface Props {
  data: Point[];
  height?: number;
}

const SimpleChart: React.FC<Props> = ({ data, height = 120 }) => {
  const width = 300; // fixed viewBox width
  if (!data.length) {
    return <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} />;
  }
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}> 
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
};

export default SimpleChart;
