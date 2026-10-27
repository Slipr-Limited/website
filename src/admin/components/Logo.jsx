/**
 * admin/components/Logo.jsx — The Slipr logo slot.
 *
 * Put your logo file at  website/public/brand/slipr-logo.svg  (SVG is best; PNG also works if
 * you change the extension below). Until that file exists, the plain "Slipr" wordmark shows.
 * Nothing else in the admin needs to change.
 */

import React, { useState } from 'react';

export const LOGO_SRC = '/brand/slipr-logo.svg';

/**
 * @param {'dark' | 'light'} tone  dark: for dark-green surfaces. light: for cream tickets.
 */
export function SliprLogo({ tone = 'dark', showTagline = false }) {
  const [missing, setMissing] = useState(false);
  const word = tone === 'dark' ? 'var(--ad-text)' : 'var(--ad-ink)';
  const tag  = tone === 'dark' ? 'var(--ad-muted)' : 'var(--ad-ink-3)';

  return (
    <div className="ad-logo">
      {!missing && (
        <img src={LOGO_SRC} alt="Slipr" onError={() => setMissing(true)} />
      )}
      {missing && (
        <div>
          <div className="ad-logo__word" style={{ color: word }}>Slipr</div>
          {showTagline && <div className="ad-logo__tag" style={{ color: tag }}>Admin</div>}
        </div>
      )}
    </div>
  );
}
