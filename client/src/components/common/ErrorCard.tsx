import type { ReactNode } from 'react';
import ErrorCard from '../ui/ErrorCard';

interface Props {
  msg?: string;
  message?: string;
  onRetry?: () => void;
  title?: string;
  retryLabel?: string;
  actions?: ReactNode;
}

const LegacyErrorCard = ({ msg, message, onRetry, title, retryLabel, actions }: Props) => {
  const resolvedMessage = message ?? msg ?? 'Something went wrong';

  return (
    <ErrorCard
      title={title}
      message={resolvedMessage}
      retryLabel={retryLabel}
      onRetry={onRetry}
      actions={actions}
    />
  );
};

export default LegacyErrorCard;
