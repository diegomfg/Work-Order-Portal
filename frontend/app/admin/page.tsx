import Link from 'next/link';
import styles from './page.module.css';

const STAT_CARDS = [
  { label: 'Total',       color: 'var(--text)'   },
  { label: 'Completed',   color: 'var(--green)'  },
  { label: 'Warranty',    color: 'var(--purple)' },
  { label: 'NWF',         color: 'var(--amber)'  },
  { label: 'Review',      color: 'var(--red)'    },
  { label: 'In Progress', color: 'var(--blue)'   },
];

export default function AdminPage() {
  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Dashboard</h1>
        <Link href="/admin/upload" className={styles.uploadBtn}>
          Upload New Report →
        </Link>
      </div>

      <p className={styles.lastUpdated}>
        Last updated: <strong>—</strong>
      </p>

      <div className={styles.statsStrip}>
        {STAT_CARDS.map((card) => (
          <div key={card.label} className={styles.statCard}>
            <span className={styles.statValue} style={{ color: card.color }}>—</span>
            <span className={styles.statLabel}>{card.label}</span>
          </div>
        ))}
      </div>

      <section>
        <h2 className={styles.sectionTitle}>Recent Uploads</h2>
        <div className={styles.uploadsBox}>
          <p className={styles.emptyState}>
            No uploads yet.{' '}
            <Link href="/admin/upload" className={styles.inlineLink}>
              Upload a PDF report
            </Link>{' '}
            to get started.
          </p>
        </div>
      </section>
    </>
  );
}
