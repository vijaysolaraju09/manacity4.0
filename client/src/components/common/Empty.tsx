import React from "react";

interface Props {
  msg: string;
  ctaText?: string;
  onCta?: () => void;
}

const Empty: React.FC<Props> = ({ msg, ctaText, onCta }) => (
  <div className="empty-state" style={{ textAlign: "center", padding: "2rem" }}>
    <p>{msg}</p>
    {ctaText && onCta && (
      <button onClick={onCta} className="btn" style={{ marginTop: "1rem" }}>
        {ctaText}
      </button>
    )}
  </div>
);

export default Empty;
