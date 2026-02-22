import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Loader2 } from 'lucide-react';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { isActive, loading } = useSubscription();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="bg-card rounded-2xl p-8 max-w-md text-center shadow-lg border">
          <h2 className="text-xl font-semibold mb-3 text-foreground">
            Abonnement verlopen
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Je abonnement is niet meer actief. Neem contact op om je
            abonnement te verlengen.
          </p>
          {/* Toekomst: Stripe checkout button hier */}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
