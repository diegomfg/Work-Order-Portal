'use client';

import { useRouter } from 'next/navigation';

export default function LimitSelect({ current, className }: { current: number; className?: string }) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/admin/workorders?page=1&limit=${e.target.value}`);
  }

  return (
    <select value={current} onChange={handleChange} className={className}>
      {[10, 20, 50].map((n) => (
        <option key={n} value={n}>
          {n} per page
        </option>
      ))}
    </select>
  );
}
