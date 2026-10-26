// Indian PIN code validator and region resolution

export const isValidIndianPincode = (code) => {
  return /^[1-9]\d{5}$/.test(String(code || "").trim());
};

// Major postal zone mapping for instant offline region display
const ZONE_MAP = {
  11: "Delhi",
  12: "Haryana",
  14: "Punjab",
  16: "Chandigarh",
  20: "UP West",
  22: "Lucknow",
  30: "Jaipur",
  38: "Ahmedabad",
  40: "Mumbai",
  41: "Pune",
  50: "Hyderabad",
  56: "Bengaluru",
  60: "Chennai",
  68: "Kochi",
  70: "Kolkata",
};

export const lookupPincode = (pincode) => {
  const code = String(pincode || "").trim();
  if (!isValidIndianPincode(code)) {
    return { valid: false, pincode: code, city: "Invalid", location: "Invalid Pincode" };
  }
  const prefix = code.slice(0, 2);
  const city = ZONE_MAP[prefix] || "India";
  return {
    valid: true,
    pincode: code,
    city,
    location: `${city} ${code}`,
  };
};
