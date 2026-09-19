import { useMemo } from "react";
import { formatINR } from "../utils/format.js";
import { swatchFor, isColourKey } from "../utils/colorSwatch.js";

// Attribute-based variant selector (Color, Storage, Size, etc.)
// Extract unique attribute keys preserving original product definition order
const keysOf = (variants) => {
  const keys = [];
  for (const variant of variants) {
    for (const key of Object.keys(variant.attributes || {})) {
      if (!keys.includes(key)) {
        keys.push(key);
      }
    }
  }
  return keys;
};

// Extract unique attribute values in insertion order
const valuesOf = (variants, key) => {
  const values = [];
  for (const variant of variants) {
    const value = variant.attributes?.[key];
    if (value !== undefined && !values.includes(value)) {
      values.push(value);
    }
  }
  return values;
};

const VariantPicker = ({ variants, selected, onSelect }) => {
  const keys = useMemo(() => keysOf(variants), [variants]);
  const valuesByKey = useMemo(() => {
    const map = {};
    for (const key of keys) {
      map[key] = valuesOf(variants, key);
    }
    return map;
  }, [variants, keys]);

  if (!variants.length || !keys.length) {
    return null;
  }

  const current = selected?.attributes || {};

  // What state is this option in, given everything else that is selected?
  const statusOf = (key, value) => {
    const others = keys.filter((k) => k !== key);
    const compatible = variants.filter(
      (v) => v.attributes?.[key] === value && others.every((k) => v.attributes?.[k] === current[k])
    );

    if (compatible.length === 0) {
      // The value exists on this product, just not alongside the current
      // selection. Still clickable — see chooseOption.
      return "incompatible";
    }

    return compatible.some((v) => v.countInStock > 0) ? "available" : "soldout";
  };

  // Move to the variant that has the clicked value and keeps as much of the
  // rest of the selection as possible, preferring one that is in stock.
  const chooseOption = (key, value) => {
    const candidates = variants.filter((v) => v.attributes?.[key] === value);
    if (candidates.length === 0) {
      return;
    }

    const ranked = candidates
      .map((variant) => ({
        variant,
        kept: keys.filter((k) => k !== key && variant.attributes?.[k] === current[k]).length,
        stocked: variant.countInStock > 0 ? 1 : 0,
      }))
      .sort((a, b) => b.kept - a.kept || b.stocked - a.stocked);

    onSelect(ranked[0].variant);
  };

  return (
    <div className="flex flex-col gap-4">
      {keys.map((key) => {
        const values = valuesByKey[key];
        const colourish = isColourKey(key);

        // Only show per-option prices when they actually differ within the row.
        const prices = new Set(
          values.map((value) => variants.find((v) => v.attributes?.[key] === value)?.price)
        );
        const showPrices = prices.size > 1;

        return (
          <div key={key} role="radiogroup" aria-label={key}>
            <p className="mb-2 text-sm text-ink-500">
              {key}: <span className="font-semibold text-ink-900">{current[key] || "—"}</span>
            </p>

            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const status = statusOf(key, value);
                const isSelected = current[key] === value;
                const soldOut = status === "soldout";
                const swatch = colourish ? swatchFor(value) : null;
                const price = showPrices
                  ? variants.find((v) => v.attributes?.[key] === value)?.price
                  : null;

                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => chooseOption(key, value)}
                    title={soldOut ? `${value} — sold out` : value}
                    className={`flex items-center gap-2 rounded-sm border px-3 py-2 text-left text-sm transition-all ${
                      isSelected
                        ? "border-accent-500 bg-accent-50 ring-2 ring-accent-200"
                        : "border-ink-200 hover:border-ink-400"
                    } ${status === "incompatible" ? "opacity-60" : ""} ${
                      soldOut ? "text-ink-400" : "text-ink-800"
                    }`}
                  >
                    {swatch && (
                      <span
                        aria-hidden="true"
                        style={{ backgroundColor: swatch }}
                        className="h-5 w-5 shrink-0 rounded-full border border-ink-300"
                      />
                    )}

                    <span className="flex flex-col">
                      <span className={`font-medium ${soldOut ? "line-through" : ""}`}>{value}</span>
                      {price != null && (
                        <span className="text-2xs text-ink-500">{formatINR(price)}</span>
                      )}
                      {soldOut && (
                        <span className="text-2xs uppercase tracking-wide text-ink-400">
                          Sold out
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VariantPicker;
