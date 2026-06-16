'use client';

import { useState } from 'react';
import { WorkOrder, WorkOrderStatus, EquipmentType } from '@/lib/types';
import styles from './WorkOrderCard.module.css';

const STATUS_CONFIG: Record<WorkOrderStatus, { color: string; label: string }> = {
  completed:  { color: 'var(--green)',  label: 'Completed' },
  warranty:   { color: 'var(--purple)', label: 'Under Warranty' },
  nwf:        { color: 'var(--amber)',  label: 'Contact Shop' },
  review:     { color: 'var(--red)',    label: 'Needs Review' },
  inprogress: { color: 'var(--blue)',   label: 'In Progress' },
};

const TYPE_LABEL: Record<EquipmentType, string> = {
  lawn:    'Lawn',
  '2cycle': '2-Cycle',
  other:   'Other',
};

function parseDateBadge(iso: string): { month: string; day: string } {
  const d = new Date(iso + 'T00:00:00');
  return {
    month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    day: String(d.getDate()),
  };
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface Props {
  workOrder: WorkOrder;
}

export default function WorkOrderCard({ workOrder: wo }: Props) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[wo.status];
  const badge = parseDateBadge(wo.inDate);

  return (
    <div className={styles.card}>
      <button
        className={styles.header}
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <span className={styles.dot} style={{ background: status.color }} />

        <div className={styles.identity}>
          <span className={styles.woId}>#{wo.id}</span>
          <span className={styles.customer}>{wo.customer}</span>
        </div>

        <div className={styles.equipment}>
          <span className={styles.mfr}>{wo.mfr}</span>
          <span className={styles.desc}>{wo.desc}</span>
        </div>

        <div className={styles.meta}>
          <span className={styles.typeTag}>{TYPE_LABEL[wo.type]}</span>

          <div className={styles.dateBadge}>
            <span className={styles.dateMonth}>{badge.month}</span>
            <span className={styles.dateDay}>{badge.day}</span>
          </div>

          <span className={styles.statusBadge} style={{ color: status.color }}>
            {status.label}
          </span>
        </div>

        <svg
          className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className={styles.body}>
          <div className={styles.mobileStatus}>
            <span className={styles.dot} style={{ background: status.color }} />
            <span style={{ color: status.color }}>{status.label}</span>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detail}>
              <span className={styles.detailLabel}>Equipment</span>
              <span className={styles.detailValue}>{wo.mfr} {wo.model}</span>
            </div>
            <div className={styles.detail}>
              <span className={styles.detailLabel}>Description</span>
              <span className={styles.detailValue}>{wo.desc}</span>
            </div>
            <div className={styles.detail}>
              <span className={styles.detailLabel}>Serial / VIN</span>
              <span className={styles.detailValue}>{wo.serial}</span>
            </div>
            <div className={styles.detail}>
              <span className={styles.detailLabel}>Shop Tag</span>
              <span className={styles.detailValue}>#{wo.tag}</span>
            </div>
            <div className={styles.detail}>
              <span className={styles.detailLabel}>Date In</span>
              <span className={styles.detailValue}>{formatDate(wo.inDate)}</span>
            </div>
            {wo.complDate && (
              <div className={styles.detail}>
                <span className={styles.detailLabel}>Completed</span>
                <span className={styles.detailValue}>{formatDate(wo.complDate)}</span>
              </div>
            )}
            {wo.meter && (
              <div className={styles.detail}>
                <span className={styles.detailLabel}>Meter</span>
                <span className={styles.detailValue}>{wo.meter} hrs</span>
              </div>
            )}
          </div>

          {wo.status === 'warranty' && (
            <div className={`${styles.callout} ${styles.calloutWarranty}`}>
              <strong>Warranty Approved</strong>
              <p>Warranty coverage has been approved for this order. Please contact the shop for details — coverage may not include all labor or parts.</p>
            </div>
          )}

          {wo.status === 'nwf' && (
            <div className={`${styles.callout} ${styles.calloutNwf}`}>
              <p>Please contact the shop directly — a service advisor can explain the outcome of this work order.</p>
            </div>
          )}

          {wo.status === 'review' && (
            <div className={`${styles.callout} ${styles.calloutReview}`}>
              <strong>Awaiting Status Update</strong>
              <p>This order is pending an update. Please contact the shop for details.</p>
            </div>
          )}

          {wo.comments && (
            <div className={styles.notes}>
              <span className={styles.notesLabel}>Technician Notes</span>
              <p className={styles.notesText}>{wo.comments}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
