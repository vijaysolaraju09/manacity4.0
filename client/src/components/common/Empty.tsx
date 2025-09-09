import React from "react";

interface Props {
  msg: string;
  ctaText?: string;
  onCta?: () => void;
}

const Empty: React.FC<Props> = ({ msg, ctaText, onCta }) => (
  <div style={{ textAlign: "center", padding: "2rem" }}>
    <p>{msg}</p>
    {ctaText && onCta && (
      <button onClick={onCta} style={{ marginTop: "1rem" }}>
        {ctaText}
      </button>
    )}
  </div>
);

export default Empty;
