import { Globe2 } from 'lucide-react';

import { getCountryMark } from '../partenaires.utils';

export function CountryMark({ country }: { country: string }) {
  const mark = getCountryMark(country);

  if (!mark) {
    return (
      <span
        className="inline-flex h-3.5 w-5 shrink-0 items-center justify-center rounded-[2px] border border-anac-border bg-white text-anac-muted"
        title={country}
        aria-label={`Pays : ${country}`}
      >
        <Globe2 size={10} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className="relative inline-flex h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] border border-black/10 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.25)]"
      style={{ background: mark.background }}
      title={country}
      aria-label={`Pays : ${country}`}
    >
      {mark.symbol === 'dot' && (
        <span className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-300" />
      )}
      {mark.symbol === 'cross' && (
        <>
          <span className="absolute left-[8px] top-0 h-full w-[3px] bg-white" />
          <span className="absolute left-0 top-[5px] h-[3px] w-full bg-white" />
        </>
      )}
      {mark.symbol === 'canada' && (
        <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-red-600" />
      )}
    </span>
  );
}
