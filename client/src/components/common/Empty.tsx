import EmptyState from '../ui/EmptyState';

interface Props {
  msg: string;
  ctaText?: string;
  onCta?: () => void;
}

const Empty = ({ msg, ctaText, onCta }: Props) => (
  <EmptyState message={msg} ctaLabel={ctaText} onCtaClick={onCta} />
);

export default Empty;
