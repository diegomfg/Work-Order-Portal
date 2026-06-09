'use client';

import { useState } from 'react';
import { WorkOrder } from '@/lib/types';
import SearchBar from '@/components/SearchBar';
import WorkOrderCard from '@/components/WorkOrderCard';
import styles from './page.module.css';

export default function StatusPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WorkOrder[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setHasSubmitted(true);
    try {
      const res = await fetch(`/api/workorders/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.workorders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setHasSubmitted(false);
    setError(null);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            <div>
              <div className={styles.shopName}>All Dade Lawnmowers</div>
              <div className={styles.portalLabel}>Service Status Portal</div>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Check Your Repair Status</h1>
        <p className={styles.heroSub}>
          Enter your work order number, unit serial number, or customer ID
        </p>
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={handleSubmit}
          onClear={handleClear}
        />
      </div>

      <main className={styles.main}>
        {!hasSubmitted && (
          <div className={styles.emptyState}>
            <p>Your work order details will appear here.</p>
          </div>
        )}

        {loading && (
          <div className={styles.emptyState}>
            <p>Searching...</p>
          </div>
        )}

        {error && (
          <div className={styles.emptyState}>
            <p>Something went wrong. Please try again.</p>
          </div>
        )}

        {hasSubmitted && !loading && !error && results.length === 0 && (
          <div className={styles.emptyState}>
            <p>No work orders found for <strong>&ldquo;{query}&rdquo;</strong>.</p>
            <p className={styles.emptyHint}>Try your work order number, your unit&apos;s serial number, or your customer ID from a previous invoice.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className={styles.results}>
            <div className={styles.resultsCount}>
              {results.length} work order{results.length !== 1 ? 's' : ''} found
            </div>
            <div className={styles.cardList}>
              {results.map(wo => (
                <WorkOrderCard key={wo.id} workOrder={wo} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
