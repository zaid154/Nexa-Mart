// Address and Indian PIN code validation utilities

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

// Required fields for delivery
export const REQUIRED_ADDRESS_FIELDS = [
  "fullName",
  "phone",
  "line1",
  "city",
  "state",
  "postalCode",
];

// Indian states list for address form dropdown
export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Chandigarh", "Jammu and Kashmir"
];

// Regex patterns
export const PHONE_PATTERN = /^[6-9]\d{9}$/;
export const PINCODE_PATTERN = /^[1-9]\d{5}$/;

export const isValidIndianPincode = (pincode) => PINCODE_PATTERN.test(String(pincode || "").trim());
export const isValidPhone = (phone) => PHONE_PATTERN.test(String(phone || "").trim());

// Validate full address before placing order or updating profile
export const validateAddress = (addr = {}) => {
  const errors = {};
  const name = String(addr.fullName || "").trim();
  const phone = String(addr.phone || "").trim();
  const line1 = String(addr.line1 || "").trim();
  const city = String(addr.city || "").trim();
  const state = String(addr.state || "").trim();
  const pincode = String(addr.postalCode || "").trim();

  if (!name || name.length < 2) errors.fullName = "Full name is required (min 2 characters)";
  if (!isValidPhone(phone)) errors.phone = "Valid 10-digit mobile number required (starts with 6-9)";
  if (!line1 || line1.length < 5) errors.line1 = "Street address is required (min 5 characters)";
  if (!city || city.length < 2) errors.city = "City is required";
  if (!state) errors.state = "State is required";
  if (!isValidIndianPincode(pincode)) errors.postalCode = "Valid 6-digit Indian PIN code required";

  return errors;
};

// Helper for navbar delivery location check
export const lookupPincode = (pincode) => {
  const code = String(pincode || "").trim();
  const valid = isValidIndianPincode(code);
  return {
    valid,
    pincode: code,
    city: valid ? "Delivery Location" : "",
    location: valid ? `Pincode ${code}` : "Invalid Pincode",
  };
};
