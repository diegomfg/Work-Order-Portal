import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './layout.module.css';

export const metadata: Metadata = {
  title: 'Admin — Work Order Portal',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.nav}>
        <div className={styles.navBrand}>
          <span className={styles.navLogo}>WO Portal</span>
          <span className={styles.navBadge}>Admin</span>
        </div>
        <Link href="/status" className={styles.navLink}>
          ← View Portal
        </Link>
      </header>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}
