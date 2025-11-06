import type { FC } from 'react'

const ThemeStyles: FC = () => (
  <style>{`
    :root {
      color-scheme: light;
    }

    html {
      min-height: 100%;
      font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background-color: var(--surface-0);
      color: var(--text-primary);
      scroll-behavior: smooth;
    }

    body {
      margin: 0;
      min-height: 100%;
      background-color: var(--surface-0);
      color: var(--text-primary);
    }

    html[data-theme='light'] {
      --primary: #12c9b2;
      --accent: #8b5cf6;
      --surface-0: #f8fafc;
      --surface-1: #ffffff;
      --border: rgba(15, 23, 42, 0.08);
      --text-primary: #0f172a;
      --text-muted: rgba(15, 23, 42, 0.6);
      --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.08);
      --shadow-md: 0 12px 30px rgba(15, 23, 42, 0.1);
      --shadow-lg: 0 25px 65px rgba(15, 23, 42, 0.16);
      --ring: 0 0 0 2px color-mix(in srgb, var(--primary) 35%, transparent);
    }

    html[data-theme='dark'] {
      color-scheme: dark;
      --primary: #22d3ee;
      --accent: #a78bfa;
      --surface-0: #020617;
      --surface-1: #0f172a;
      --border: rgba(148, 163, 184, 0.18);
      --text-primary: #e2e8f0;
      --text-muted: rgba(148, 163, 184, 0.68);
      --shadow-sm: 0 1px 3px rgba(2, 6, 23, 0.45);
      --shadow-md: 0 12px 35px rgba(2, 6, 23, 0.55);
      --shadow-lg: 0 30px 80px rgba(2, 6, 23, 0.65);
      --ring: 0 0 0 2px color-mix(in srgb, var(--primary) 45%, transparent);
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    button {
      font-family: inherit;
    }

    .bg-surface-0 {
      background-color: var(--surface-0);
    }

    .bg-surface-1 {
      background-color: var(--surface-1);
    }

    .text-primary {
      color: var(--text-primary);
    }

    .text-muted {
      color: var(--text-muted);
    }

    .border-default {
      border-color: var(--border);
    }

    .shadow-sm-theme {
      box-shadow: var(--shadow-sm);
    }

    .shadow-md-theme {
      box-shadow: var(--shadow-md);
    }

    .shadow-lg-theme {
      box-shadow: var(--shadow-lg);
    }

    .ring-focus {
      box-shadow: var(--ring);
    }

    .gradient-hero {
      background-image: linear-gradient(135deg, color-mix(in srgb, var(--primary) 75%, transparent), color-mix(in srgb, var(--accent) 85%, transparent));
    }

    .gradient-card {
      background-image: linear-gradient(135deg, color-mix(in srgb, var(--accent) 65%, transparent), color-mix(in srgb, var(--primary) 50%, transparent));
    }

    .tab-indicator {
      position: relative;
    }

    .tab-indicator::after {
      content: '';
      position: absolute;
      inset-inline: 0;
      bottom: -0.65rem;
      height: 3px;
      border-radius: 9999px;
      background: var(--primary);
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    .tab-indicator[data-active='true']::after {
      opacity: 1;
      transform: translateY(0);
    }

    .chip-active {
      background: color-mix(in srgb, var(--primary) 14%, transparent);
      color: var(--text-primary);
      border-color: color-mix(in srgb, var(--primary) 45%, transparent);
    }

    .chip-inactive {
      background: transparent;
      color: var(--text-muted);
      border-color: var(--border);
    }

    .scroll-card::-webkit-scrollbar {
      height: 6px;
    }

    .scroll-card::-webkit-scrollbar-thumb {
      background: color-mix(in srgb, var(--text-muted) 35%, transparent);
      border-radius: 999px;
    }
  `}</style>
)

export default ThemeStyles
