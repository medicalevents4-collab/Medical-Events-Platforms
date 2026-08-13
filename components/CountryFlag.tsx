import { useState } from "react";
import { countryFlag, countryFlagUrl } from "@/lib/flags";

interface CountryFlagProps {
  country: string;
  size?: number;
  className?: string;
}

/**
 * Renders a country flag as an image (from flagcdn.com) with an emoji
 * fallback for unknown countries or failed image loads.
 */
export function CountryFlag({ country, size = 20, className = "" }: CountryFlagProps) {
  const url = countryFlagUrl(country, Math.max(size * 2, 40));
  const [errored, setErrored] = useState(false);

  if (!url || errored) {
    return (
      <span
        className={className}
        style={{ fontSize: size }}
        aria-label={country}
        role="img"
      >
        {countryFlag(country)}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={`Flag of ${country}`}
      width={size * 1.3}
      height={size}
      loading="lazy"
      onError={() => setErrored(true)}
      className={`inline-block rounded-[2px] object-cover ${className}`}
      style={{ width: size * 1.3, height: size }}
    />
  );
}
