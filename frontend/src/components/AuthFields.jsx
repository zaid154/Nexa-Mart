// The form controls shared by the five auth screens (login, register, verify
// OTP, forgot password, reset password). They were plain placeholder-only
// inputs before, which meant the label vanished the moment you started typing.

import { useId, useRef, useState } from "react";
import { IconCheckSmall, IconEye, IconEyeOff } from "./Icons.jsx";

// A text field whose label floats up out of the box once something is typed.
// The placeholder is still set (and made transparent) because the floating
// trick reads :placeholder-shown to know whether the field is empty.
export const AuthField = ({ label, error, hint, id, className = "", ...rest }) => {
  const autoId = useId();
  const fieldId = id || autoId;

  let underline = "border-ink-200";
  if (error) {
    underline = "border-danger";
  }

  return (
    <div>
      <div className="relative">
        <input
          id={fieldId}
          placeholder={label}
          aria-invalid={!!error}
          className={`peer w-full border-0 border-b ${underline} bg-transparent px-0 pb-2 pt-6 text-[15px] text-ink-900 transition-colors placeholder:text-transparent focus:border-accent-500 focus:outline-none focus:ring-0 ${className}`}
          {...rest}
        />

        <label
          htmlFor={fieldId}
          className="pointer-events-none absolute left-0 top-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400 transition-all duration-200 peer-placeholder-shown:top-[26px] peer-placeholder-shown:text-[15px] peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-wide peer-focus:text-accent-500"
        >
          {label}
        </label>

        {/* Accent bar that sweeps in from the left while the field has focus. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 bg-accent-500 transition-transform duration-300 peer-focus:scale-x-100"
        />
      </div>

      {hint && !error && <p className="form-hint">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
};

// How strong a password looks. Deliberately mirrors the server's rules so the
// meter never says "Strong" for something the API will reject.
const scorePassword = (value) => {
  let score = 0;
  if (value.length >= 8) {
    score += 1;
  }
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) {
    score += 1;
  }
  if (/[0-9]/.test(value)) {
    score += 1;
  }
  if (/[^A-Za-z0-9]/.test(value) || value.length >= 12) {
    score += 1;
  }
  return score;
};

const STRENGTH = [
  { label: "Too short", bar: "bg-danger", text: "text-danger" },
  { label: "Weak", bar: "bg-danger", text: "text-danger" },
  { label: "Fair", bar: "bg-warning", text: "text-warning" },
  { label: "Good", bar: "bg-accent-500", text: "text-accent-500" },
  { label: "Strong", bar: "bg-success", text: "text-success" },
];

// One rule from the password checklist, ticked green once it is satisfied.
const Rule = ({ ok, children }) => (
  <span
    className={`inline-flex items-center gap-1 ${ok ? "text-success" : "text-ink-400"}`}
  >
    <span
      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
        ok ? "bg-success text-white" : "bg-ink-200 text-transparent"
      }`}
    >
      <IconCheckSmall size={9} />
    </span>
    {children}
  </span>
);

// A password field with a show/hide eye and, when `strength` is on, a meter
// plus the live checklist of what the server requires.
export const PasswordField = ({ label, error, value = "", strength = false, ...rest }) => {
  const [visible, setVisible] = useState(false);
  const score = scorePassword(value);
  const level = STRENGTH[score];

  return (
    <div>
      <div className="relative">
        <AuthField
          label={label}
          error={error}
          value={value}
          type={visible ? "text" : "password"}
          className="pr-10"
          {...rest}
        />

        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-0 top-[22px] rounded p-1 text-ink-400 transition-colors hover:text-accent-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500"
        >
          {visible ? <IconEyeOff size={18} /> : <IconEye size={18} />}
        </button>
      </div>

      {strength && value.length > 0 && (
        <div className="mt-2.5">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i < score ? level.bar : "bg-ink-200"
                  }`}
                />
              ))}
            </div>
            <span className={`text-2xs font-bold uppercase tracking-wide ${level.text}`}>
              {level.label}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-2xs">
            <Rule ok={value.length >= 8}>8+ characters</Rule>
            <Rule ok={/[A-Z]/.test(value) && /[a-z]/.test(value)}>Upper &amp; lower</Rule>
            <Rule ok={/[0-9]/.test(value)}>A number</Rule>
          </div>
        </div>
      )}
    </div>
  );
};

// Six separate boxes for an OTP / reset code. Typing walks forward on its own,
// backspace walks back, and pasting the whole code from the email just works.
export const CodeInput = ({ value = "", onChange, length = 6, error, autoFocus = false }) => {
  const boxes = useRef([]);
  const chars = Array.from({ length }, (_, i) => value[i] || "");

  const focusBox = (i) => {
    const el = boxes.current[Math.max(0, Math.min(i, length - 1))];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const writeAt = (i, char) => {
    const next = chars.slice();
    next[i] = char;
    onChange(next.join("").slice(0, length));
  };

  const handleChange = (i) => (e) => {
    const digits = e.target.value.replace(/\D/g, "");

    if (digits.length === 0) {
      writeAt(i, "");
      return;
    }

    // More than one digit means a paste, or typing over a box that already had
    // a value (the browser hands us old + new). Drop the old one and fill
    // forward from here.
    if (digits.length > 1) {
      let incoming = digits;
      if (chars[i] && incoming[0] === chars[i]) {
        incoming = incoming.slice(1);
      }

      const next = chars.slice();
      for (let k = 0; k < incoming.length && i + k < length; k += 1) {
        next[i + k] = incoming[k];
      }
      onChange(next.join("").slice(0, length));
      focusBox(i + incoming.length);
      return;
    }

    writeAt(i, digits);
    focusBox(i + 1);
  };

  const handleKeyDown = (i) => (e) => {
    if (e.key === "Backspace" && !chars[i] && i > 0) {
      e.preventDefault();
      writeAt(i - 1, "");
      focusBox(i - 1);
      return;
    }
    if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      focusBox(i - 1);
      return;
    }
    if (e.key === "ArrowRight" && i < length - 1) {
      e.preventDefault();
      focusBox(i + 1);
    }
  };

  // Paste anywhere in the row fills the whole code.
  const handlePaste = (e) => {
    const digits = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, length);
    if (!digits) {
      return;
    }
    e.preventDefault();
    onChange(digits);
    focusBox(digits.length);
  };

  return (
    <div>
      <div className="grid grid-cols-6 gap-2" onPaste={handlePaste}>
        {chars.map((char, i) => {
          let tone = "border-ink-200 bg-white";
          if (char) {
            tone = "border-accent-200 bg-accent-50";
          }
          if (error) {
            tone = "border-danger bg-danger-soft";
          }

          return (
            <input
              // A box is a fixed slot in the code, so its position is its identity.
              key={i}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              value={char}
              onChange={handleChange(i)}
              onKeyDown={handleKeyDown(i)}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              autoFocus={autoFocus && i === 0}
              aria-label={`Digit ${i + 1}`}
              aria-invalid={!!error}
              className={`h-14 w-full rounded-sm border text-center text-xl font-bold text-ink-900 transition-colors focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 ${tone}`}
            />
          );
        })}
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
};
