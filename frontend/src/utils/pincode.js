// Pincode lookup and delivery estimation using India Post public API
const pincodeCache = new Map();

// Validate 6-digit Indian postal code format
export const isValidIndianPincode = (pincode) => {
  const clean = String(pincode || "").trim();
  return /^[1-9]\d{5}$/.test(clean);
};

// Format estimated delivery date based on transit days
export const formatEstimatedDate = (days) => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + Number(days || 0));

  if (days === 1) {
    return `Tomorrow, ${targetDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  }

  return targetDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

// Check in-memory cache synchronously
export const lookupPincodeSync = (pincode) => {
  const code = String(pincode || "").trim();
  if (pincodeCache.has(code)) {
    return pincodeCache.get(code);
  }
  return null;
};

// Fetch city and state dynamically from India Post API
export const lookupPincode = async (pincode) => {
  const code = String(pincode || "").trim();
  if (!isValidIndianPincode(code)) {
    return {
      valid: false,
      pincode: code,
      error: "Please enter a valid 6-digit PIN code",
    };
  }

  // Return cached result if available
  if (pincodeCache.has(code)) {
    return pincodeCache.get(code);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://api.postalpincode.in/pincode/${code}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    const entry = data?.[0];

    if (entry?.Status === "Success" && entry.PostOffice?.length > 0) {
      const office = entry.PostOffice[0];
      const city = office.District || office.Block || office.Name || "Delivery Hub";
      const state = office.State || "India";

      const result = {
        valid: true,
        pincode: code,
        city,
        state,
        location: `${city}, ${state}`,
        daysMin: 2,
        daysMax: 4,
        error: null,
      };

      pincodeCache.set(code, result);
      return result;
    }

    return {
      valid: false,
      pincode: code,
      error: "Delivery not available for this pincode",
    };
  } catch {
    // Graceful fallback on network timeout or failure
    const result = {
      valid: true,
      pincode: code,
      city: "India",
      state: "India",
      location: `Pincode ${code}`,
      daysMin: 2,
      daysMax: 4,
      error: null,
    };
    pincodeCache.set(code, result);
    return result;
  }
};

// Calculate delivery estimate, shipping fees, and transit dates
export const calculatePincodeDelivery = async (pincode, options = {}) => {
  const { price = 0, commerce = {} } = options;
  const lookup = await lookupPincode(pincode);

  if (!lookup.valid) {
    return {
      valid: false,
      pincode: lookup.pincode,
      error: lookup.error,
    };
  }

  const transitDays = lookup.daysMax || 3;
  const formattedDate = formatEstimatedDate(transitDays);

  const freeThreshold = commerce.freeShippingThreshold ?? 500;
  const standardFee = commerce.shippingFee ?? 40;
  const isFree = Number(price) >= freeThreshold;

  return {
    valid: true,
    pincode: lookup.pincode,
    city: lookup.city,
    state: lookup.state,
    location: lookup.location,
    daysMin: lookup.daysMin,
    daysMax: lookup.daysMax,
    formattedDate,
    etaText: `Delivery by ${formattedDate}`,
    isFree,
    shippingFee: standardFee,
    codAvailable: commerce.codEnabled !== false,
    error: null,
  };
};
