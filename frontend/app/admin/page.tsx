import { headers } from 'next/headers';
import Link from 'next/link';
import styles from './page.module.css';

type Stats = {
  total: number;
  completed: number;
  warranty: number;
  nwf: number;
  review: number;
  inprogress: number;
};

type UploadRecord = {
  id: number;
  filename: string;
  uploaded_at: string;
  wo_count: number;
  inserted: number;
  updated: number;
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default async function AdminPage() {
  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const base = `${protocol}://${host}`;

  const [metaRes, statsRes, uploadsRes] = await Promise.all([
    fetch(`${base}/api/meta`,                    { cache: 'no-store' }),
    fetch(`${base}/api/workorders?stats=true`,    { cache: 'no-store' }),
    fetch(`${base}/api/uploads?limit=10`,         { cache: 'no-store' }),
  ]);

  const meta        = metaRes.ok    ? await metaRes.json()    : { lastUpdated: null };
  const statsData   = statsRes.ok   ? await statsRes.json()   : { stats: {} };
  const uploadsData = uploadsRes.ok ? await uploadsRes.json() : { uploads: [] };

  const lastUpdated: string | null = meta.lastUpdated;
  const stats: Stats = { total: 0, completed: 0, warranty: 0, nwf: 0, review: 0, inprogress: 0, ...statsData.stats };
  const uploads: UploadRecord[] = uploadsData.uploads ?? [];

  const STAT_CARDS = [
    { label: 'Total',       value: stats.total,       color: 'var(--text)'   },
    { label: 'Completed',   value: stats.completed,   color: 'var(--green)'  },
    { label: 'Warranty',    value: stats.warranty,    color: 'var(--purple)' },
    { label: 'NWF',         value: stats.nwf,         color: 'var(--amber)'  },
    { label: 'Review',      value: stats.review,      color: 'var(--red)'    },
    { label: 'In Progress', value: stats.inprogress,  color: 'var(--blue)'   },
  ];

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Dashboard</h1>
        <Link href="/admin/upload" className={styles.uploadBtn}>
          Upload New Report →
        </Link>
      </div>

      <p className={styles.lastUpdated}>
        Last updated: <strong>{formatDate(lastUpdated)}</strong>
      </p>

      <div className={styles.statsStrip}>
        {STAT_CARDS.map((card) => (
          <div key={card.label} className={styles.statCard}>
            <span className={styles.statValue} style={{ color: card.color }}>
              {card.value}
            </span>
            <span className={styles.statLabel}>{card.label}</span>
          </div>
        ))}
      </div>

      <section>
        <h2 className={styles.sectionTitle}>Recent Uploads</h2>
        <div className={styles.uploadsBox}>
          {uploads.length === 0 ? (
            <p className={styles.emptyState}>
              No uploads yet.{' '}
              <Link href="/admin/upload" className={styles.inlineLink}>
                Upload a PDF report
              </Link>{' '}
              to get started.
            </p>
          ) : (
            <table className={styles.uploadsTable}>
              <thead>
                <tr>
                  <th className={styles.uploadsTh}>File</th>
                  <th className={styles.uploadsTh}>Uploaded</th>
                  <th className={[styles.uploadsTh, styles.uploadsThNum].join(' ')}>Total</th>
                  <th className={[styles.uploadsTh, styles.uploadsThNum].join(' ')}>New</th>
                  <th className={[styles.uploadsTh, styles.uploadsThNum].join(' ')}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u: UploadRecord) => (
                  <tr key={u.id} className={styles.uploadsTr}>
                    <td className={styles.uploadsTd}>{u.filename}</td>
                    <td className={[styles.uploadsTd, styles.uploadsTdMuted].join(' ')}>
                      {formatDate(u.uploaded_at)}
                    </td>
                    <td className={[styles.uploadsTd, styles.uploadsThNum].join(' ')}>{u.wo_count}</td>
                    <td className={[styles.uploadsTd, styles.uploadsThNum, styles.uploadsTdGreen].join(' ')}>{u.inserted}</td>
                    <td className={[styles.uploadsTd, styles.uploadsThNum, styles.uploadsTdMuted].join(' ')}>{u.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
