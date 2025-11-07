import React from 'react';
import { Link } from 'react-router-dom';

export default function Section({ title, seeAllTo, children }: { title: string; seeAllTo: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Link to={seeAllTo} className="text-accent-500 hover:underline">
          See all
        </Link>
      </div>
      {children}
    </section>
  );
}
