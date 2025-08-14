import Toolbar from '../components/ui/Toolbar';
import SectionHeader from '../components/ui/SectionHeader';
import PriceBlock from '../components/ui/PriceBlock';
import StatusChip from '../components/ui/StatusChip';

const UiPreview = () => {
  return (
    <>
      <Toolbar title={<span>Preview</span>} actions={<button>Action</button>} />
      <div className="container" style={{ paddingTop: 'var(--space-4)' }}>
        <SectionHeader title="Featured" href="#" />
        <PriceBlock price={199} mrp={299} />
        <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
          <StatusChip status="pending" />
          <StatusChip status="accepted" />
          <StatusChip status="rejected" />
          <StatusChip status="cancelled" />
        </div>
      </div>
    </>
  );
};

export default UiPreview;

