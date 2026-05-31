'use client';

import styles from './SearchBar.module.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.inputWrap}>
        <svg className={styles.icon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className={styles.input}
          placeholder="Work order #, serial number, or customer ID..."
          value={value}
          onChange={e => onChange(e.target.value)}
          autoFocus
          spellCheck={false}
        />
        {value && (
          <button className={styles.clear} onClick={() => onChange('')} aria-label="Clear search">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
