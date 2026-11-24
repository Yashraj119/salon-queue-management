import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiUrl } from '../api/config';

type UnlockResult = 'ok' | 'invalid' | 'network_error';
type StaffSessionValue = {
  pin: string | null;
  unlock: (candidate: string) => Promise<UnlockResult>;
  lock: () => void;
};

const StaffSessionContext = createContext<StaffSessionValue | null>(null);

export function StaffSessionProvider({ children }: { children: ReactNode }) {
  const [pin, setPin] = useState<string | null>(() => sessionStorage.getItem('salon-staff-pin'));

  const lock = useCallback(() => {
    sessionStorage.removeItem('salon-staff-pin');
    setPin(null);
  }, []);

  const unlock = useCallback(async (candidate: string): Promise<UnlockResult> => {
    try {
      const response = await fetch(apiUrl('/api/staff/unlock'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: candidate }),
      });
      if (response.status === 401) return 'invalid';
      if (!response.ok) return 'network_error';
      sessionStorage.setItem('salon-staff-pin', candidate);
      setPin(candidate);
      return 'ok';
    } catch {
      return 'network_error';
    }
  }, []);

  const value = useMemo(() => ({ pin, unlock, lock }), [pin, unlock, lock]);
  return <StaffSessionContext.Provider value={value}>{children}</StaffSessionContext.Provider>;
}

export function useStaffSession() {
  const value = useContext(StaffSessionContext);
  if (!value) throw new Error('useStaffSession must be used inside StaffSessionProvider');
  return value;
}
