import React from 'react';

export default function HorizontalScroller<T>({ data, renderItem }: { data: T[]; renderItem: (d: T) => React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  return (
    <div className="relative">
      <button
        aria-label="scroll-left"
        className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 bg-surface-1/90 border border-borderc/40 shadow"
        onClick={() => ref.current?.scrollBy({ left: -320, behavior: 'smooth' })}
        type="button"
      >
        ‹
      </button>
      <div ref={ref} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2">
        {data.map((d, i) => (
          <div key={i} className="snap-start">
            {renderItem(d)}
          </div>
        ))}
      </div>
      <button
        aria-label="scroll-right"
        className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 bg-surface-1/90 border border-borderc/40 shadow"
        onClick={() => ref.current?.scrollBy({ left: 320, behavior: 'smooth' })}
        type="button"
      >
        ›
      </button>
    </div>
  );
}
