import { Link } from "react-router-dom";

// Custom logo image from the env (set VITE_LOGO_URL in the root .env). Kept for
// the printable invoice, which needs a plain <img> so the logo prints reliably.
export const LOGO_URL = import.meta.env.VITE_LOGO_URL || "";

// The single site-wide brand lockup: italic "NexaMart" wordmark + yellow "Plus"
// chip + "Explore Plus ✦" tagline.
//   to      - link target (default "/"; pass null for no link)
//   variant - "light" for blue/dark backgrounds (yellow wordmark, navbar style)
//             "dark" for white backgrounds (blue wordmark, auth/footer/invoice)
//   tagline - show the "Explore Plus ✦" sub-line (default true)
export function Logo({ to = "/", variant = "dark", tagline = true, className = "" }) {
  const light = variant === "light";

  const inner = (
    <span className="flex flex-col justify-center">
      <span className="flex items-center gap-1">
        <span
          className={`text-xl font-black italic tracking-tight sm:text-2xl ${
            light ? "text-yellow-400" : "text-accent-500"
          }`}
        >
          NexaMart
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-sm ${
            light ? "bg-yellow-400 text-accent-600" : "bg-accent-500 text-white"
          }`}
        >
          Plus
        </span>
      </span>
      {tagline && (
        <span
          className={`text-[10px] font-medium italic tracking-wide ${
            light ? "text-white/80" : "text-ink-400"
          }`}
        >
          Explore{" "}
          <span className={`font-bold ${light ? "text-yellow-300" : "text-copper-400"}`}>
            Plus ✦
          </span>
        </span>
      )}
    </span>
  );

  const base = "group flex shrink-0 items-center";
  if (to === null) {
    return <span className={`${base} ${className}`}>{inner}</span>;
  }
  return (
    <Link to={to} aria-label="Home" className={`${base} ${className}`}>
      {inner}
    </Link>
  );
}

export default Logo;
