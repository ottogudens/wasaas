import { Suspense } from 'react';
import { BillingPanel } from '../../../components/dashboard/BillingPanel';

export default function BillingPage() {
  return (
    <Suspense>
      <BillingPanel />
    </Suspense>
  );
}
