import type { ReactNode } from 'react';
import ErrorCard from '../ui/ErrorCard';

interface Props {
  msg: string;
  onRetry?: () => void;
  title?: string;
  retryLabel?: string;
  actions?: ReactNode;
}

const LegacyErrorCard = ({ msg, onRetry, title, retryLabel, actions }: Props) => (
  <ErrorCard
    title={title}
    message={msg}
    retryLabel={retryLabel}
    onRetry={onRetry}
    actions={actions}
  />
);

export default LegacyErrorCard;
