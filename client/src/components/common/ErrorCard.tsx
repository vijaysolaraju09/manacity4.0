import React from "react";

interface Props {
  msg: string;
  onRetry?: () => void;
}

const ErrorCard: React.FC<Props> = ({ msg, onRetry }) => (
  <div style={{ textAlign: "center", padding: "2rem", color: "red" }}>
    <p>{msg}</p>
    {onRetry && (
      <button onClick={onRetry} style={{ marginTop: "1rem" }}>
        Retry
      </button>
    )}
  </div>
);

export default ErrorCard;
