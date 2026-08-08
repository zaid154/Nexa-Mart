// One place that decides what a shipping address may contain. Checkout and the
// profile page both used to carry their own copy of the blank address and their
// own idea of what counted as valid — the profile page had no rules at all, so
// a 20-digit phone saved there flowed straight into checkout as a "saved
// address". These rules are mirrored field-for-field by the Zod schema in
// backend/src/validators/orderValidators.js; change one, change the other.

export const EMPTY_ADDRESS = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

// Indian mobile numbers are ten digits and never start below 6.
export const PHONE_PATTERN = /^[6-9]\d{9}$/;
// Indian PIN codes are six digits and never start with 0.
export const PINCODE_PATTERN = /^[1-9]\d{5}$/;

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

// Which fields the shopper must fill. Used by the form to mark them and by the
// validator below, so a field can never be starred but unchecked (or worse,
// checked but unstarred, which is what the old checkout did to state/country).
export const REQUIRED_ADDRESS_FIELDS = [
  "fullName",
  "phone",
  "line1",
  "city",
  "state",
  "postalCode",
  "country",
];

const text = (address, key) => String(address?.[key] ?? "").trim();

// Returns an object of field -> message. Empty object means the address is fine.
export const validateAddress = (address) => {
  const errors = {};

  const fullName = text(address, "fullName");
  if (!fullName) {
    errors.fullName = "Full name is required";
  } else if (fullName.length < 2) {
    errors.fullName = "Please enter the full name";
  } else if (fullName.length > 60) {
    errors.fullName = "Name must be 60 characters or less";
  }

  const phone = text(address, "phone");
  if (!phone) {
    errors.phone = "Mobile number is required";
  } else if (!/^\d+$/.test(phone)) {
    errors.phone = "Mobile number can only contain digits";
  } else if (phone.length !== 10) {
    errors.phone = `Mobile number must be exactly 10 digits (you entered ${phone.length})`;
  } else if (!PHONE_PATTERN.test(phone)) {
    errors.phone = "An Indian mobile number starts with 6, 7, 8 or 9";
  }

  const line1 = text(address, "line1");
  if (!line1) {
    errors.line1 = "Address is required";
  } else if (line1.length < 5) {
    errors.line1 = "Please enter the house or street details";
  } else if (line1.length > 120) {
    errors.line1 = "Address must be 120 characters or less";
  }

  if (text(address, "line2").length > 120) {
    errors.line2 = "Landmark must be 120 characters or less";
  }

  const city = text(address, "city");
  if (!city) {
    errors.city = "City is required";
  } else if (city.length > 60) {
    errors.city = "City must be 60 characters or less";
  }

  if (!text(address, "state")) {
    errors.state = "State is required";
  }

  const postalCode = text(address, "postalCode");
  if (!postalCode) {
    errors.postalCode = "Pincode is required";
  } else if (!/^\d+$/.test(postalCode)) {
    errors.postalCode = "Pincode can only contain digits";
  } else if (postalCode.length !== 6) {
    errors.postalCode = `Pincode must be exactly 6 digits (you entered ${postalCode.length})`;
  } else if (!PINCODE_PATTERN.test(postalCode)) {
    errors.postalCode = "A pincode does not start with 0";
  }

  if (!text(address, "country")) {
    errors.country = "Country is required";
  }

  return errors;
};

// True when the address would pass validateAddress.
export const isAddressValid = (address) => Object.keys(validateAddress(address)).length === 0;

// One-line rendering used on the saved-address cards and order pages.
export const formatAddressLine = (address) => {
  if (!address) {
    return "";
  }
  return [address.line1, address.line2, address.city, address.state, address.postalCode]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
};
