// Sponsor portal layout — standalone, no admin sidebar.
// All /sponsor/* routes render inside this minimal layout.

export default function SponsorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', color: '#ffffff', fontFamily: 'system-ui, sans-serif' }}>
      {children}
    </div>
  );
}
