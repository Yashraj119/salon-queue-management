import { useState } from 'react';
import type { Barber } from '../api/publicApi';
import { strings } from '../strings';

export function BarberAvatar({ barber, size = 'regular' }: { barber: Barber; size?: 'regular' | 'large' }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const initials = barber.name.slice(0, 1).toUpperCase();

  return (
    <span className={`barber-avatar barber-avatar-${size}`}>
      <span aria-hidden="true" className="barber-avatar-fallback">{initials}</span>
      {!photoFailed && barber.photoUrl && (
        <img
          src={barber.photoUrl}
          alt={strings.barberPhoto(barber.name)}
          loading="lazy"
          onError={() => setPhotoFailed(true)}
        />
      )}
    </span>
  );
}
