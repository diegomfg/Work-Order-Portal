'use client';

import { useState, useRef } from 'react';
import type { WorkOrder } from '@/lib/db';
import styles from './WorkOrderForm.module.css';

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

type FormState = {
  status: string;
  customer: string;
  customer_id: string;
  mfr: string;
  description: string;
  tag: string;
  tech: string;
  comments: string;
};

function toFormState(wo: WorkOrder): FormState {
  return {
    status:      wo.status,
    customer:    wo.customer,
    customer_id: String(wo.customer_id),
    mfr:         wo.mfr,
    description: wo.description,
    tag:         wo.tag ?? '',
    tech:        wo.tech ?? '',
    comments:    wo.comments ?? '',
  };
}

export default function WorkOrderForm({ wo }: { wo: WorkOrder }) {
  const [form, setForm] = useState<FormState>(() => toFormState(wo));
  const saved = useRef<FormState>(toFormState(wo));

  const isDirty = (Object.keys(form) as (keyof FormState)[]).some(
    (k) => form[k] !== saved.current[k]
  );
  const customerIdChanged = form.customer_id !== saved.current.customer_id;

  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [confirmInput, setConfirmInput] = useState('');

  function update(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setResult(null);
  }

  async function doSave() {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch(`/api/workorders/${wo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          customer_id: parseInt(form.customer_id, 10),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Unknown error');
      }
      saved.current = { ...form };
      setResult({ ok: true, msg: 'Changes saved.' });
    } catch (err) {
      setResult({ ok: false, msg: err instanceof Error ? err.message : 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    if (customerIdChanged) {
      setModalStep(1);
      setConfirmInput('');
      setShowModal(true);
    } else {
      doSave();
    }
  }

  function handleModalNext() {
    if (modalStep === 1) {
      setModalStep(2);
      setConfirmInput('');
    } else {
      setShowModal(false);
      doSave();
    }
  }

  function handleModalCancel() {
    setShowModal(false);
    setConfirmInput('');
  }

  const step2Valid = confirmInput === form.customer_id;

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.woNumber}>Work Order #{wo.id}</p>
          <h1 className={styles.title}>{form.customer || wo.customer}</h1>
        </div>
        <span
          className={styles.badge}
          style={{
            color: STATUS_COLORS[form.status],
            borderColor: STATUS_COLORS[form.status],
            background: `${STATUS_COLORS[form.status]}18`,
          }}
        >
          {STATUS_LABELS[form.status] ?? form.status}
        </span>
      </div>

      <div className={styles.grid}>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Customer</h2>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Name</label>
            <input
              className={styles.input}
              value={form.customer}
              onChange={(e) => update('customer', e.target.value)}
            />
          </div>

          <div className={styles.formField}>
            <div className={styles.labelRow}>
              <label className={styles.fieldLabel}>Customer ID</label>
              <span className={styles.confirmHint}>requires confirmation to change</span>
            </div>
            <input
              className={styles.input}
              value={form.customer_id}
              onChange={(e) => update('customer_id', e.target.value)}
            />
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Equipment</h2>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Manufacturer</label>
            <input
              className={styles.input}
              value={form.mfr}
              onChange={(e) => update('mfr', e.target.value)}
            />
          </div>

          <div className={styles.readField}>
            <span className={styles.fieldLabel}>Model</span>
            <span className={styles.fieldValue}>{wo.model}</span>
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Description</label>
            <input
              className={styles.input}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>

          <div className={styles.readField}>
            <span className={styles.fieldLabel}>Serial</span>
            <span className={styles.fieldValue}>{wo.serial ?? '—'}</span>
          </div>

          <div className={styles.readField}>
            <span className={styles.fieldLabel}>Type</span>
            <span className={styles.fieldValue}>{TYPE_LABELS[wo.type] ?? wo.type}</span>
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Tag</label>
            <input
              className={styles.input}
              value={form.tag}
              onChange={(e) => update('tag', e.target.value)}
            />
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Dates</h2>
          {([
            ['Date In',    wo.in_date],
            ['Start Date', wo.start_date],
            ['Completed',  wo.compl_date],
            ['Out Date',   wo.out_date],
          ] as [string, string | null][]).map(([label, val]) => (
            <div key={label} className={styles.readField}>
              <span className={styles.fieldLabel}>{label}</span>
              <span className={styles.fieldValue}>{formatDate(val)}</span>
            </div>
          ))}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Admin</h2>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Status</label>
            <select
              className={styles.select}
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
            >
              <option value="completed">Completed</option>
              <option value="warranty">Warranty</option>
              <option value="nwf">NWF</option>
              <option value="review">Review</option>
              <option value="inprogress">In Progress</option>
            </select>
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Technician</label>
            <input
              className={styles.input}
              value={form.tech}
              onChange={(e) => update('tech', e.target.value)}
            />
          </div>
        </section>

      </div>

      <section className={styles.commentsCard}>
        <h2 className={styles.cardTitle}>Comments</h2>
        <textarea
          className={styles.textarea}
          value={form.comments}
          onChange={(e) => update('comments', e.target.value)}
          rows={5}
        />
      </section>

      <div className={styles.saveBar}>
        {result && (
          <span className={result.ok ? styles.msgOk : styles.msgErr}>
            {result.msg}
          </span>
        )}
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={!isDirty || saving}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {showModal && (
        <div className={styles.overlay} onClick={handleModalCancel}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

            {modalStep === 1 ? (
              <>
                <h3 className={styles.modalTitle}>Change customer ID?</h3>
                <p className={styles.modalBody}>
                  This will reassign work order <strong>#{wo.id}</strong> from customer ID{' '}
                  <strong>{saved.current.customer_id}</strong> to{' '}
                  <strong>{form.customer_id}</strong>.
                </p>
                <p className={styles.modalWarning}>
                  Double-check this is correct — assigning a work order to the wrong customer is hard to undo.
                </p>
                <div className={styles.modalActions}>
                  <button className={styles.modalBtnCancel} onClick={handleModalCancel}>
                    Cancel
                  </button>
                  <button className={styles.modalBtnConfirm} onClick={handleModalNext}>
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className={styles.modalTitle}>Confirm the new ID</h3>
                <p className={styles.modalBody}>
                  Type <strong>{form.customer_id}</strong> below to confirm the change.
                </p>
                <input
                  className={styles.modalInput}
                  placeholder={form.customer_id}
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && step2Valid && handleModalNext()}
                  autoFocus
                />
                <div className={styles.modalActions}>
                  <button className={styles.modalBtnCancel} onClick={handleModalCancel}>
                    Cancel
                  </button>
                  <button
                    className={styles.modalBtnConfirm}
                    onClick={handleModalNext}
                    disabled={!step2Valid}
                  >
                    Confirm Change
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}
