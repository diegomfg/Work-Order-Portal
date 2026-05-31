'use client';

import styles from './SearchBar.module.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export default function SearchBar({ value, onChange, onSubmit, onClear }: Props) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') onSubmit();
  }

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
          placeholder="Work order #, unit serial number, or customer ID..."
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          spellCheck={false}
        />
        {value && (
          <button className={styles.clear} onClick={onClear} aria-label="Clear search">
            ✕
          </button>
        )}
      </div>
      <button className={styles.searchBtn} onClick={onSubmit}>
        Search
      </button>
    </div>
  );
}
