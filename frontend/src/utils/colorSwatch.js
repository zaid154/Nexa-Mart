// Hex values for the colour names the catalogue actually uses, so the variant
// picker can show a swatch instead of a word.
//
// Anything not listed here falls back to a plain text chip, which is the right
// answer for values like "Stainless Steel" or "Alligator Leather" where a flat
// circle of colour would say less than the name does.

const SWATCHES = {
  // Phones
  "sierra blue": "#9BB5CE",
  graphite: "#54524F",
  "space grey": "#535150",
  silver: "#E3E4E5",
  "prism white": "#F2F3F5",
  "prism black": "#1B1B1D",
  "prism blue": "#3C5A9A",
  "midnight black": "#141416",
  "orchid grey": "#8E8A93",
  "fluid black": "#1D1F22",
  "space silver": "#C9CDD2",
  "astral blue": "#2E4A82",
  "piano black": "#0E0E10",
  "pearl blue": "#5B7FB8",
  "pearl white": "#F0EEEA",
  "ruby red": "#8E1C2B",
  "ink blue": "#243B55",

  // Audio
  "sky blue": "#9CC4DC",
  green: "#4C7A52",
  "beats black": "#171717",
  "yuzu yellow": "#E8C33B",
  "flame blue": "#2C6FBB",
  "cosmic grey": "#4A4A4C",
  charcoal: "#37393B",
  sandstone: "#D8CFC0",
  "heather grey": "#A9A9A6",

  // Watches, cases and accessories
  brown: "#6B4226",
  tan: "#B78B60",
  plum: "#6E3F5F",
  "deep navy": "#2B3A55",
  "pink citrus": "#F2A093",
  "rose gold": "#D6A08C",
  "gold aluminium": "#D4B483",
  white: "#FFFFFF",
  black: "#1A1A1A",
  blue: "#3B6FB6",
};

// The hex for a colour name, or null when we have none.
export const swatchFor = (value) => {
  if (!value) {
    return null;
  }
  return SWATCHES[String(value).trim().toLowerCase()] || null;
};

// Attribute keys whose values are worth rendering as a swatch at all.
const COLOUR_KEYS = ["color", "colour", "dial"];

export const isColourKey = (key) => COLOUR_KEYS.includes(String(key || "").trim().toLowerCase());
