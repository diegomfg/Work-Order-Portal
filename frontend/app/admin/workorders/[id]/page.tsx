import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWorkOrderById } from '@/lib/db';
import WorkOrderForm from './WorkOrderForm';
import styles from './page.module.css';

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
      <WorkOrderForm wo={wo} />
    </>
  );
}
