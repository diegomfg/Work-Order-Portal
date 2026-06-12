import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWorkOrderById } from '@/lib/db';
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

const TYPE_LABELS: Record<string, string> = {
  lawn:    'Lawn Equipment',
  '2cycle': '2-Cycle',
  other:   'Other',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value}</span>
    </div>
  );
}

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const wo = getWorkOrderById(parseInt(id, 10));

  if (!wo) notFound();

  return (
    <>
      <div className={styles.backRow}>
        <Link href="/admin/workorders" className={styles.backLink}>← Work Orders</Link>
      </div>

      <div className={styles.pageHeader}>
        <div>
          <p className={styles.woNumber}>Work Order #{wo.id}</p>
          <h1 className={styles.title}>{wo.customer}</h1>
        </div>
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
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Customer</h2>
          <Field label="Name"        value={wo.customer} />
          <Field label="Customer ID" value={String(wo.customer_id)} />
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Equipment</h2>
          <Field label="Manufacturer" value={wo.mfr} />
          <Field label="Model"        value={wo.model} />
          <Field label="Description"  value={wo.description} />
          <Field label="Serial"       value={wo.serial ?? '—'} />
          <Field label="Type"         value={TYPE_LABELS[wo.type] ?? wo.type} />
          <Field label="Tag"          value={wo.tag ?? '—'} />
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Dates</h2>
          <Field label="Date In"    value={formatDate(wo.in_date)} />
          <Field label="Start Date" value={formatDate(wo.start_date)} />
          <Field label="Completed"  value={formatDate(wo.compl_date)} />
          <Field label="Out Date"   value={formatDate(wo.out_date)} />
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Admin</h2>
          <Field label="Technician" value={wo.tech ?? '—'} />
        </section>
      </div>

      <section className={styles.commentsCard}>
        <h2 className={styles.cardTitle}>Comments</h2>
        <p className={styles.comments}>{wo.comments || '—'}</p>
      </section>
    </>
  );
}
