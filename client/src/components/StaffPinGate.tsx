import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { KeyRound } from 'lucide-react';
import { strings } from '../strings';
import { useStaffSession } from '../auth/StaffSession';

export function StaffPinGate({ children }: { children: ReactNode }) {
  const { pin, unlock } = useStaffSession();
  const [candidate, setCandidate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (pin) return children;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    const result = await unlock(candidate);
    if (result === 'invalid') setMessage(strings.pinIncorrect);
    if (result === 'network_error') setMessage(strings.pinNetworkError);
    setSubmitting(false);
  }

  return (
    <section className="staff-pin-card luxury-card">
      <p className="eyebrow"><KeyRound size={14} strokeWidth={1.5} />{strings.staffBadge}</p>
      <h2>{strings.staffPinTitle}</h2>
      <p className="staff-pin-description">{strings.staffPinDescription}</p>
      <form className="staff-pin-form" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="staff-pin">
          {strings.pinLabel}
          <input
            id="staff-pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={candidate}
            onChange={(event) => setCandidate(event.target.value)}
            aria-describedby={message ? 'staff-pin-error' : undefined}
            aria-invalid={Boolean(message)}
          />
        </label>
        {message && <p id="staff-pin-error" className="field-error" role="alert">{message}</p>}
        <button type="submit" className="button-primary" disabled={submitting || candidate.length === 0}>
          {submitting ? strings.checkingPin : strings.unlockStaff}
        </button>
      </form>
    </section>
  );
}
