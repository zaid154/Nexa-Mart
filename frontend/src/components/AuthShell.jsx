import Logo from "./Logo.jsx";
import { IconCheckSmall, IconLockSmall } from "./Icons.jsx";

// Line-art illustrations for the blue side panel. Plain inline SVG so the auth
// screens have no image dependency.
const art = {
  bag: (
    <svg viewBox="0 0 120 120" className="h-24 w-24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M28 40h64l-6 62H34z" strokeLinejoin="round" />
      <path d="M45 40V29a15 15 0 0 1 30 0v11" strokeLinecap="round" />
      <circle cx="45" cy="55" r="3" fill="currentColor" stroke="none" />
      <circle cx="75" cy="55" r="3" fill="currentColor" stroke="none" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 120 120" className="h-24 w-24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="60" cy="44" r="20" />
      <path d="M22 102c0-21 17-32 38-32s38 11 38 32" strokeLinecap="round" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 120 120" className="h-24 w-24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="30" y="54" width="60" height="48" rx="6" strokeLinejoin="round" />
      <path d="M44 54V40a16 16 0 0 1 32 0v14" strokeLinecap="round" />
      <circle cx="60" cy="76" r="5" />
      <path d="M60 81v9" strokeLinecap="round" />
    </svg>
  ),
  otp: (
    <svg viewBox="0 0 120 120" className="h-24 w-24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="38" y="18" width="44" height="84" rx="8" strokeLinejoin="round" />
      <path d="M52 30h16" strokeLinecap="round" />
      <path d="M48 58h8M64 58h8M48 74h8M64 74h8" strokeLinecap="round" />
      <circle cx="60" cy="92" r="3" fill="currentColor" stroke="none" />
    </svg>
  ),
};

// The little "Email → New password" progress row shown above the form on the
// two-step flows, so people know how far along they are.
const Steps = ({ labels, active }) => (
  <ol className="mb-7 flex items-center gap-2">
    {labels.map((label, i) => {
      const done = i < active;
      const current = i === active;

      let dot = "bg-ink-100 text-ink-400";
      if (done) {
        dot = "bg-success text-white";
      } else if (current) {
        dot = "bg-accent-500 text-white";
      }

      return (
        <li key={label} className="flex flex-1 items-center gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold ${dot}`}
          >
            {done ? <IconCheckSmall size={11} /> : i + 1}
          </span>
          <span
            className={`truncate text-2xs font-semibold uppercase tracking-wide ${
              current ? "text-ink-900" : "text-ink-400"
            }`}
          >
            {label}
          </span>
          {i < labels.length - 1 && (
            <span className={`h-px flex-1 ${done ? "bg-success" : "bg-ink-200"}`} />
          )}
        </li>
      );
    })}
  </ol>
);

// Shared two-panel frame for every auth screen: blue copy panel on the left,
// white form on the right.
//   heading      - big white heading in the blue panel
//   subheading   - supporting line under it
//   bullets      - optional list of perks shown in the blue panel
//   illustration - key of `art` above
//   steps        - optional ["Email", "New password"] progress labels
//   activeStep   - which of those steps is the current one (0-based)
//   footer       - full-width link row under the form
const AuthShell = ({
  heading,
  subheading,
  bullets = [],
  illustration = "bag",
  steps = null,
  activeStep = 0,
  footer,
  children,
}) => (
  <div className="w-full max-w-[880px] animate-rise-in">
    <div className="grid overflow-hidden rounded-sm bg-white shadow-deep md:grid-cols-[360px_1fr]">
      {/* Left brand panel — desktop only. */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-promo-band px-8 py-9 text-white md:flex">
        {/* Soft shapes so the panel reads as a designed surface, not a flat block. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-14 h-52 w-52 rounded-full bg-white/[0.07]"
        />

        <div className="relative">
          <Logo to={null} variant="light" tagline={false} />

          <h2 className="mt-7 text-[26px] font-bold leading-tight">{heading}</h2>
          {subheading && (
            <p className="mt-3 text-sm leading-relaxed text-white/75">{subheading}</p>
          )}

          {bullets.length > 0 && (
            <ul className="mt-6 space-y-3">
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-white/85">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <IconCheckSmall size={10} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Illustration, framed so it stops floating in empty space. */}
        <div className="relative mt-8 flex justify-center">
          <div className="flex h-36 w-36 items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-inset ring-white/20">
            {art[illustration]}
          </div>
        </div>

        <p className="relative mt-8 flex items-center gap-2 text-2xs text-white/60">
          <IconLockSmall size={13} />
          Your details are sent over a secure, encrypted connection.
        </p>
      </div>

      {/* Right form panel. */}
      <div className="flex flex-col">
        {/* On phones the blue panel is hidden, so carry the same message in a
            compact band instead of dropping people onto a bare form. */}
        <div className="bg-promo-band px-7 py-6 text-white md:hidden">
          <Logo to={null} variant="light" tagline={false} />
          <h2 className="mt-4 text-xl font-bold leading-tight">{heading}</h2>
          {subheading && <p className="mt-1.5 text-sm text-white/75">{subheading}</p>}
        </div>

        <div className="flex-1 px-7 py-8 sm:px-10">
          {steps && <Steps labels={steps} active={activeStep} />}
          {children}
        </div>

        {footer && (
          <div className="border-t border-ink-100 px-7 py-5 text-center sm:px-10">
            <p className="text-sm font-semibold text-accent-500">{footer}</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default AuthShell;
