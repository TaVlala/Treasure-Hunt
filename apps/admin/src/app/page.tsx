// Root page — redirects to /dashboard.
// Middleware handles the actual auth check before this runs.

import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}
