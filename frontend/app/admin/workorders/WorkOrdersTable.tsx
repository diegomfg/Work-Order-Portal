'use client';

import { useRouter } from 'next/navigation';
import type { WorkOrder } from '@/lib/db';
import styles from './page.module.css';

const STATUS_COLORS: Record<string, string> = {
  completed:  'var(--green)',
  warranty:   'var(--purple)',
  nwf:        'var(--amber)',
  review:     'var(--red)',
  inprogress: 'var(--blue)',
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

export default function WorkOrdersTable({ workorders }: { workorders: WorkOrder[] }) {
  const router = useRouter();

  if (workorders.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={7} className={styles.emptyRow}>No work orders found.</td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody>
      {workorders.map((wo) => (
        <tr
          key={wo.id}
          className={styles.tr}
          onClick={() => router.push(`/admin/workorders/${wo.id}`)}
        >
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
      ))}
    </tbody>
  );
}
