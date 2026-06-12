import Link from 'next/link';
import { getWorkOrdersPaginated } from '@/lib/db';
import LimitSelect from './LimitSelect';
import styles from './page.module.css';

const STATUS_COLORS: Record<string, string> = {
  completed: 'var(--green)',
  warranty:  'var(--purple)',
  nwf:       'var(--amber)',
  review:    'var(--red)',
  inprogress:'var(--blue)',
};

const STATUS_LABELS: Record<string, string> = {
  completed:  'Completed',
  warranty:   'Warranty',
  nwf:        'NWF',
  review:     'Review',
  inprogress: 'In Progress',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const VALID_LIMITS = [10, 20, 50];

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const page  = Math.max(1, parseInt(params.page  ?? '1',  10) || 1);
  const limit = VALID_LIMITS.includes(parseInt(params.limit ?? '20', 10))
    ? parseInt(params.limit ?? '20', 10)
    : 20;

  const { workorders, total } = getWorkOrdersPaginated(page, limit);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  const prevPage = page > 1          ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Work Orders</h1>
        <LimitSelect current={limit} className={styles.limitSelect} />
      </div>

      <p className={styles.subtitle}>
        {total === 0
          ? 'No work orders in the database yet.'
          : `Showing ${from}–${to} of ${total}`}
      </p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>WO #</th>
              <th className={styles.th}>Customer</th>
              <th className={styles.th}>Manufacturer</th>
              <th className={styles.th}>Model</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Date In</th>
              <th className={styles.th}>Completed</th>
            </tr>
          </thead>
          <tbody>
            {workorders.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyRow}>
                  No work orders found.
                </td>
              </tr>
            ) : (
              workorders.map((wo) => (
                <tr key={wo.id} className={styles.tr}>
                  <td className={[styles.td, styles.tdMono].join(' ')}>{wo.id}</td>
                  <td className={styles.td}>{wo.customer}</td>
                  <td className={styles.td}>{wo.mfr}</td>
                  <td className={[styles.td, styles.tdMuted].join(' ')}>{wo.model}</td>
                  <td className={styles.td}>
                    <span
                      className={styles.badge}
                      style={{
                        color: STATUS_COLORS[wo.status],
                        borderColor: STATUS_COLORS[wo.status],
                        background: `${STATUS_COLORS[wo.status]}18`,
                      }}
                    >
                      {STATUS_LABELS[wo.status] ?? wo.status}
                    </span>
                  </td>
                  <td className={[styles.td, styles.tdMuted].join(' ')}>{formatDate(wo.in_date)}</td>
                  <td className={[styles.td, styles.tdMuted].join(' ')}>{formatDate(wo.compl_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        {prevPage ? (
          <Link href={`/admin/workorders?page=${prevPage}&limit=${limit}`} className={styles.pageBtn}>
            ← Prev
          </Link>
        ) : (
          <span className={[styles.pageBtn, styles.pageBtnDisabled].join(' ')}>← Prev</span>
        )}
        <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
        {nextPage ? (
          <Link href={`/admin/workorders?page=${nextPage}&limit=${limit}`} className={styles.pageBtn}>
            Next →
          </Link>
        ) : (
          <span className={[styles.pageBtn, styles.pageBtnDisabled].join(' ')}>Next →</span>
        )}
      </div>
    </>
  );
}
