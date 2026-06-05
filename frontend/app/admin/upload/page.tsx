'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import type { WorkOrder, WorkOrderStatus } from '@/lib/types';

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
  const [step, setStep]             = useState<Step>(1);
  const [file, setFile]             = useState<File | null>(null);
  const [dragOver, setDragOver]     = useState(false);
  const [rows, setRows]             = useState<ReviewRow[]>([]);
  const [parsedData, setParsedData] = useState<Map<string, WorkOrder>>(new Map());
  const [parseError, setParseError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished]   = useState(false);
  const [publishResult, setPublishResult] = useState<{ inserted: number; updated: number } | null>(null);

  const activeRows = rows.filter(r => !r.excluded);

  function selectFile(f: File) {
    if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
      setFile(f);
      setParseError(null);
    } else {
      setParseError('Only PDF files are accepted.');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) selectFile(f);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) selectFile(f);
  }

  async function handleParse() {
    if (!file) return;
    setStep(2);
    setParseError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error || 'Failed to parse PDF.');
        return;
      }

      const workorders: WorkOrder[] = data.workorders;
      const dataMap = new Map<string, WorkOrder>();
      const displayRows: ReviewRow[] = workorders.map(wo => {
        dataMap.set(wo.id, wo);
        return { id: wo.id, customer: wo.customer, mfr: wo.mfr, model: wo.model, inDate: wo.inDate, status: wo.status, excluded: false };
      });

      setParsedData(dataMap);
      setRows(displayRows);
      setStep(3);
    } catch {
      setParseError('Could not reach the parser service. Make sure the Python server is running on port 8000.');
    }
  }

  async function handlePublish() {
    setIsPublishing(true);
    setPublishError(null);

    const workordersToPublish = activeRows.map(row => ({
      ...parsedData.get(row.id)!,
      status: row.status,
    }));

    try {
      const res = await fetch('/api/workorders/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workorders: workordersToPublish, filename: file?.name }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPublishError(data.error || 'Failed to publish work orders.');
        setIsPublishing(false);
        return;
      }

      setPublishResult({ inserted: data.inserted, updated: data.updated });
      setPublished(true);
    } catch {
      setPublishError('Network error. Please try again.');
      setIsPublishing(false);
    }
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

          {parseError && (
            <div className={styles.errorBanner}>{parseError}</div>
          )}

          <div
            className={[
              styles.dropZone,
              dragOver ? styles.dropZoneOver  : '',
              file     ? styles.dropZoneReady : '',
            ].join(' ')}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {file ? (
              <div className={styles.dropFileState}>
                <svg className={styles.dropFileIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span className={styles.dropFileName}>{file.name}</span>
                <button className={styles.dropRemove} onClick={() => setFile(null)}>Remove</button>
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
            <button className={styles.primaryBtn} disabled={!file} onClick={handleParse}>
              Parse Report →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Parsing */}
      {step === 2 && (
        <div className={styles.stepContent}>
          {parseError ? (
            <div className={styles.parsingCenter}>
              <div className={styles.errorCircle}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
              <h2 className={styles.parsingTitle}>Parse Failed</h2>
              <p className={styles.parsingDesc}>{parseError}</p>
              <button className={styles.ghostBtn} onClick={() => { setStep(1); setParseError(null); }}>
                ← Try Again
              </button>
            </div>
          ) : (
            <div className={styles.parsingCenter}>
              <div className={styles.spinner} />
              <h2 className={styles.parsingTitle}>Parsing PDF...</h2>
              <p className={styles.parsingDesc}>Extracting work orders from your report</p>
            </div>
          )}
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
            {publishError && (
              <div className={styles.errorBanner}>{publishError}</div>
            )}
            <div className={styles.publishActions}>
              <button className={styles.ghostBtn} onClick={() => setStep(3)} disabled={isPublishing}>
                ← Back to Review
              </button>
              <button className={styles.publishBtn} onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? 'Publishing...' : `Publish ${activeRows.length} Work Orders`}
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
              {publishResult
                ? `${publishResult.inserted} new, ${publishResult.updated} updated — all live on the customer portal.`
                : `${activeRows.length} work orders are now live on the customer portal.`
              }
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
