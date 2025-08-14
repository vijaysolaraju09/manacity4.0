import { motion } from 'framer-motion';
import styles from './ProfileHeader.module.scss';

export interface ProfileHeaderProps {
  avatar: string;
  name: string;
  posts?: number;
  followers?: number;
  following?: number;
  onEdit?: () => void;
}

const ProfileHeader = ({ avatar, name, posts, followers, following, onEdit }: ProfileHeaderProps) => (
  <motion.div className={styles.header} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
    <img src={avatar} alt={name} className={styles.avatar} />
    <div className={styles.info}>
      <h3>{name}</h3>
      <div className={styles.stats}>
        {posts !== undefined && <span>{posts} posts</span>}
        {followers !== undefined && <span>{followers} followers</span>}
        {following !== undefined && <span>{following} following</span>}
      </div>
    </div>
    {onEdit && (
      <button style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.8rem' }} onClick={onEdit}>
        Edit
      </button>
    )}
  </motion.div>
);

export default ProfileHeader;
