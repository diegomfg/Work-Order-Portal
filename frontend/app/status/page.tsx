'use client';

import { useState, useMemo } from 'react';
import { mockWorkOrders } from '@/lib/mockData';
import { WorkOrder } from '@/lib/types';
import SearchBar from '@/components/SearchBar';
import WorkOrderCard from '@/components/WorkOrderCard';
import styles from './page.module.css';

function search(workorders: WorkOrder[], query: string): WorkOrder[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return workorders.filter(wo =>
    wo.id.toLowerCase().includes(q) ||
    wo.serial.toLowerCase().includes(q) ||
    wo.customerId.toLowerCase().includes(q)
  );
}

export default function StatusPage() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => search(mockWorkOrders, query), [query]);
  const hasQuery = query.trim().length > 0;

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
          Enter your work order number, serial number, or customer ID
        </p>
        <SearchBar value={query} onChange={setQuery} />
      </div>

      <main className={styles.main}>
        {!hasQuery && (
          <div className={styles.emptyState}>
            <p>Your work order details will appear here.</p>
          </div>
        )}

        {hasQuery && results.length === 0 && (
          <div className={styles.emptyState}>
            <p>No work orders found for <strong>&ldquo;{query}&rdquo;</strong>.</p>
            <p className={styles.emptyHint}>Try your work order number, serial number, or customer ID from a previous invoice.</p>
          </div>
        )}

        {results.length > 0 && (
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
