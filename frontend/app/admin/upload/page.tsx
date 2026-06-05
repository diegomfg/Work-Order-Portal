'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import type { WorkOrderStatus } from '@/lib/types';

type Step = 1 | 2 | 3 | 4;

type ReviewRow = {
  id: string;
  customer: string;
  mfr: string;
  model: string;
  inDate: string;
  status: WorkOrderStatus;
  excluded: boolean;
};

const MOCK_ROWS: ReviewRow[] = [
  { id: '1398925', customer: 'SMITH, JOHN',          mfr: 'Stihl',     model: 'MS 271',         inDate: '2025-03-25', status: 'completed',  excluded: false },
  { id: '1399688', customer: 'JONES, MARY',          mfr: 'Honda',     model: 'HRX217VKA',      inDate: '2025-03-25', status: 'nwf',        excluded: false },
  { id: '1399712', customer: 'RODRIGUEZ LANDSCAPING',mfr: 'Scag',      model: 'SWZT52V-22FX',   inDate: '2025-03-26', status: 'inprogress', excluded: false },
  { id: '1399834', customer: 'BROWN, ALICE',         mfr: 'Echo',      model: 'PB-760ST',       inDate: '2025-03-26', status: 'warranty',   excluded: false },
  { id: '1399901', customer: 'WILLIAMS, BOB',        mfr: 'Husqvarna', model: '460 Rancher',    inDate: '2025-03-27', status: 'completed',  excluded: false },
  { id: '1399955', customer: 'DAVIS LAWN CARE',      mfr: 'Exmark',    model: 'LZX921EKC604',   inDate: '2025-03-27', status: 'review',     excluded: false },
  { id: '1400012', customer: 'WILSON, JAMES',        mfr: 'Stihl',     model: 'FS 111 R',       inDate: '2025-03-28', status: 'completed',  excluded: false },
];

const STATUS_OPTIONS: WorkOrderStatus[] = ['completed', 'warranty', 'nwf', 'review', 'inprogress'];

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  completed:  'Completed',
  warranty:   'Warranty',
  nwf:        'NWF',
  review:     'Review',
  inprogress: 'In Progress',
};

const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  completed:  'var(--green)',
  warranty:   'var(--purple)',
  nwf:        'var(--amber)',
  review:     'var(--red)',
  inprogress: 'var(--blue)',
};

const STEPS = ['Drop', 'Parsing', 'Review', 'Publish'];

export default function UploadPage() {
  const [step, setStep]           = useState<Step>(1);
  const [fileName, setFileName]   = useState<string | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const [rows, setRows]           = useState<ReviewRow[]>(MOCK_ROWS);
  const [published, setPublished] = useState(false);

  const activeRows = rows.filter(r => !r.excluded);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') setFileName(file.name);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  }

  function handleParse() {
    setStep(2);
    setTimeout(() => setStep(3), 2000);
  }

  function handleStatusChange(id: string, status: WorkOrderStatus) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }

  function handleToggleExclude(id: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, excluded: !r.excluded } : r));
  }

  return (
    <div className={styles.page}>

      {/* Step bar */}
      <div className={styles.stepBar}>
        {STEPS.map((label, i) => {
          const num = (i + 1) as Step;
          const isActive = num === step;
          const isDone   = num < step;
          return (
            <div key={label} className={styles.stepGroup}>
              <div className={styles.stepItem}>
                <div className={[
                  styles.stepDot,
                  isActive ? styles.stepDotActive : '',
                  isDone   ? styles.stepDotDone   : '',
                ].join(' ')}>
                  {isDone ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <polyline points="2,6 5,9 10,3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : num}
                </div>
                <span className={[styles.stepLabel, isActive ? styles.stepLabelActive : ''].join(' ')}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={[styles.stepConnector, isDone ? styles.stepConnectorDone : ''].join(' ')} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1 — Drop zone */}
      {step === 1 && (
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>Upload PDF Report</h2>
          <p className={styles.stepDesc}>
            Export a Work Order History report from Ideal DMS and drop it here.
          </p>

          <div
            className={[
              styles.dropZone,
              dragOver  ? styles.dropZoneOver   : '',
              fileName  ? styles.dropZoneReady  : '',
            ].join(' ')}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {fileName ? (
              <div className={styles.dropFileState}>
                <svg className={styles.dropFileIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span className={styles.dropFileName}>{fileName}</span>
                <button className={styles.dropRemove} onClick={() => setFileName(null)}>Remove</button>
              </div>
            ) : (
              <div className={styles.dropEmptyState}>
                <svg className={styles.dropUploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span className={styles.dropText}>Drop your PDF here</span>
                <span className={styles.dropOr}>or</span>
                <label className={styles.browseBtn}>
                  Browse files
                  <input type="file" accept=".pdf" onChange={handleFileInput} hidden />
                </label>
                <span className={styles.dropHint}>PDF files only</span>
              </div>
            )}
          </div>

          <div className={styles.stepActions}>
            <Link href="/admin" className={styles.ghostBtn}>Cancel</Link>
            <button
              className={styles.primaryBtn}
              disabled={!fileName}
              onClick={handleParse}
            >
              Parse Report →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Parsing */}
      {step === 2 && (
        <div className={styles.stepContent}>
          <div className={styles.parsingCenter}>
            <div className={styles.spinner} />
            <h2 className={styles.parsingTitle}>Parsing PDF...</h2>
            <p className={styles.parsingDesc}>Extracting work orders from your report</p>
          </div>
        </div>
      )}

      {/* Step 3 — Review */}
      {step === 3 && (
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>Review Parsed Work Orders</h2>
          <p className={styles.stepDesc}>
            Override a status or exclude rows before publishing to the portal.
          </p>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>#</th>
                  <th className={styles.th}>WO ID</th>
                  <th className={styles.th}>Customer</th>
                  <th className={styles.th}>Equipment</th>
                  <th className={styles.th}>Date In</th>
                  <th className={styles.th}>Status</th>
                  <th className={[styles.th, styles.thCenter].join(' ')}>Exclude</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={[styles.tr, row.excluded ? styles.trExcluded : ''].join(' ')}
                  >
                    <td className={[styles.td, styles.tdDim].join(' ')}>{i + 1}</td>
                    <td className={[styles.td, styles.tdMono].join(' ')}>{row.id}</td>
                    <td className={styles.td}>{row.customer}</td>
                    <td className={[styles.td, styles.tdEquip].join(' ')}>{row.mfr} {row.model}</td>
                    <td className={[styles.td, styles.tdMono].join(' ')}>{row.inDate}</td>
                    <td className={styles.td}>
                      <select
                        className={styles.statusSelect}
                        value={row.status}
                        disabled={row.excluded}
                        style={{ color: row.excluded ? 'var(--subtle)' : STATUS_COLORS[row.status] }}
                        onChange={e => handleStatusChange(row.id, e.target.value as WorkOrderStatus)}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className={[styles.td, styles.tdCenter].join(' ')}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={row.excluded}
                        onChange={() => handleToggleExclude(row.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.summaryBar}>
            <span className={styles.summaryCount}>
              <strong>{activeRows.length}</strong> work orders
              {rows.length > activeRows.length && (
                <span className={styles.summaryExcluded}>
                  {' '}({rows.length - activeRows.length} excluded)
                </span>
              )}
            </span>
            <button className={styles.primaryBtn} onClick={() => setStep(4)}>
              Continue to Publish →
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Publish confirmation */}
      {step === 4 && !published && (
        <div className={styles.stepContent}>
          <div className={styles.publishCenter}>
            <h2 className={styles.stepTitle}>Ready to Publish</h2>
            <p className={styles.stepDesc}>
              This will add or update{' '}
              <strong style={{ color: 'var(--text)' }}>{activeRows.length} work orders</strong>{' '}
              in the database. Changes are visible to customers immediately.
            </p>
            <div className={styles.publishCard}>
              <span className={styles.publishCount}>{activeRows.length}</span>
              <span className={styles.publishCountLabel}>work orders to publish</span>
            </div>
            <div className={styles.publishActions}>
              <button className={styles.ghostBtn} onClick={() => setStep(3)}>
                ← Back to Review
              </button>
              <button className={styles.publishBtn} onClick={() => setPublished(true)}>
                Publish {activeRows.length} Work Orders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — Success */}
      {step === 4 && published && (
        <div className={styles.stepContent}>
          <div className={styles.successCenter}>
            <div className={styles.successCircle}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="4,12 9,17 20,6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className={styles.successTitle}>Published</h2>
            <p className={styles.successDesc}>
              {activeRows.length} work orders are now live on the customer portal.
            </p>
            <Link href="/admin" className={styles.primaryBtn}>
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
