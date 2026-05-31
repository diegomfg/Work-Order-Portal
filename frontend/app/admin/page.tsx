export default function AdminPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--dark)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--muted)',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--orange)' }}>
          Admin Dashboard
        </div>
        <p>PDF upload and work order management — coming soon.</p>
      </div>
    </div>
  );
}
