// The shipping-address fields, in one place. Checkout wrote them through a
// helper that set no attributes at all — every box was a plain text input, so
// the "10-digit mobile number" happily took twenty characters and phones showed
// an alphabetic keyboard. The profile page wrote the same eight fields out
// longhand with no validation whatsoever. Both now render this.

import { useId } from "react";
import { INDIAN_STATES, REQUIRED_ADDRESS_FIELDS } from "../utils/address.js";

// Keep only digits and stop at `maxLength`. The product page's pincode widget
// already did this; the checkout never did.
const digitsOnly = (value, maxLength) => value.replace(/\D/g, "").slice(0, maxLength);

// Declared at module scope on purpose. Defined inside AddressForm it would be a
// brand-new component type on every render, so React would unmount and remount
// each input as you typed and the caret would jump out of the field.
const Field = ({ id, name, label, error, hint, wide, children }) => {
  const required = REQUIRED_ADDRESS_FIELDS.includes(name);

  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className={`label ${required ? "label-req" : ""}`}>
        {label}
      </label>

      {children}

      {error ? (
        <p id={`${id}-err`} className="form-error">
          {error}
        </p>
      ) : (
        hint && <p className="form-hint">{hint}</p>
      )}
    </div>
  );
};

const AddressForm = ({ value, onChange, errors = {}, disabled = false }) => {
  const uid = useId();
  const idFor = (name) => `${uid}-${name}`;

  const set = (name, next) => {
    onChange({ ...value, [name]: next });
  };

  // Shared props for every plain text box, so no field can quietly miss one.
  const inputProps = (name) => ({
    id: idFor(name),
    name,
    className: "input",
    value: value[name] || "",
    disabled,
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${idFor(name)}-err` : undefined,
  });

  const fieldProps = (name, label, extra = {}) => ({
    id: idFor(name),
    name,
    label,
    error: errors[name],
    ...extra,
  });

  return (
    <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
      <Field {...fieldProps("fullName", "Full name")}>
        <input
          {...inputProps("fullName")}
          maxLength={60}
          autoComplete="name"
          onChange={(e) => set("fullName", e.target.value)}
        />
      </Field>

      <Field
        {...fieldProps("phone", "Mobile number", {
          hint: "10 digits, starting with 6, 7, 8 or 9",
        })}
      >
        <input
          {...inputProps("phone")}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          autoComplete="tel"
          onChange={(e) => set("phone", digitsOnly(e.target.value, 10))}
        />
      </Field>

      <Field {...fieldProps("line1", "Address (area and street)", { wide: true })}>
        <input
          {...inputProps("line1")}
          maxLength={120}
          autoComplete="address-line1"
          onChange={(e) => set("line1", e.target.value)}
        />
      </Field>

      <Field {...fieldProps("line2", "Landmark (optional)", { wide: true })}>
        <input
          {...inputProps("line2")}
          maxLength={120}
          autoComplete="address-line2"
          onChange={(e) => set("line2", e.target.value)}
        />
      </Field>

      <Field {...fieldProps("city", "City / District / Town")}>
        <input
          {...inputProps("city")}
          maxLength={60}
          autoComplete="address-level2"
          onChange={(e) => set("city", e.target.value)}
        />
      </Field>

      <Field {...fieldProps("state", "State")}>
        <select
          {...inputProps("state")}
          className="select"
          autoComplete="address-level1"
          onChange={(e) => set("state", e.target.value)}
        >
          <option value="">Select state</option>
          {INDIAN_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </Field>

      <Field {...fieldProps("postalCode", "Pincode", { hint: "6 digits" })}>
        <input
          {...inputProps("postalCode")}
          inputMode="numeric"
          maxLength={6}
          autoComplete="postal-code"
          onChange={(e) => set("postalCode", digitsOnly(e.target.value, 6))}
        />
      </Field>

      <Field {...fieldProps("country", "Country")}>
        <input
          {...inputProps("country")}
          maxLength={60}
          autoComplete="country-name"
          onChange={(e) => set("country", e.target.value)}
        />
      </Field>
    </div>
  );
};

export default AddressForm;
