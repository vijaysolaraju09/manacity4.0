import { motion } from 'framer-motion';
import styles from './ProfileHeader.module.scss';

export interface ProfileHeaderProps {
  avatar: string;
  name: string;
  role: string;
  location?: string;
  stats?: Array<{ label: string; value: number }>;
  actions?: Array<{ label: string; onClick: () => void }>;
}

const ProfileHeader = ({
  avatar,
  name,
  role,
  location,
  stats = [],
  actions = [],
}: ProfileHeaderProps) => (
  <motion.div
    className={styles.header}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <img src={avatar} alt={name} className={styles.avatar} />
    <div className={styles.info}>
      <div className={styles.nameRow}>
        <h3>{name}</h3>
        <span className={styles.role}>{role}</span>
      </div>
      {location && <p className={styles.location}>{location}</p>}
      {stats.length > 0 && (
        <div className={styles.stats}>
          {stats.map((s) => (
            <span key={s.label}>
              <strong>{s.value}</strong> {s.label}
            </span>
          ))}
        </div>
      )}
      {actions.length > 0 && (
        <div className={styles.actions}>
          {actions.map(({ label, onClick }) => (
            <button key={label} type="button" onClick={onClick}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  </motion.div>
);

export default ProfileHeader;

