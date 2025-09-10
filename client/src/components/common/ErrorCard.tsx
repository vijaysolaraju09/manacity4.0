import React from "react";

interface Props {
  msg: string;
  onRetry?: () => void;
}

const ErrorCard: React.FC<Props> = ({ msg, onRetry }) => (
  <div className="error-card" style={{ textAlign: "center", padding: "2rem" }}>
    <p>{msg}</p>
    {onRetry && (
      <button onClick={onRetry} className="btn" style={{ marginTop: "1rem" }}>
        Retry
      </button>
    )}
  </div>
);

export default ErrorCard;
