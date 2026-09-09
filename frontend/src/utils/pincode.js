// Indian Postal PIN Code Directory and Delivery Estimation Engine.
// Resolves 6-digit Indian PIN codes to City/District, State, Delivery Tier, and Transit Days.

export const PINCODE_PREFIX_DIRECTORY = [
  // ── 1xxx: Northern Zone 1 (Delhi, Haryana, Punjab, HP, J&K, Ladakh, Chandigarh) ──
  { prefix: "110", city: "New Delhi", state: "Delhi", tier: "metro", daysMin: 1, daysMax: 2 },
  { prefix: "121", city: "Faridabad", state: "Haryana", tier: "ncr", daysMin: 1, daysMax: 2 },
  { prefix: "122", city: "Gurugram", state: "Haryana", tier: "ncr", daysMin: 1, daysMax: 2 },
  { prefix: "120", city: "Sonipat / Rohtak", state: "Haryana", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "12", city: "Haryana", state: "Haryana", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "13", city: "Haryana", state: "Haryana", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "140", city: "Mohali / Ropar", state: "Punjab", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "141", city: "Ludhiana", state: "Punjab", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "143", city: "Amritsar", state: "Punjab", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "144", city: "Jalandhar", state: "Punjab", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "14", city: "Punjab", state: "Punjab", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "15", city: "Bathinda / Punjab", state: "Punjab", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "160", city: "Chandigarh", state: "Chandigarh", tier: "tier1", daysMin: 1, daysMax: 2 },
  { prefix: "171", city: "Shimla", state: "Himachal Pradesh", tier: "hill", daysMin: 3, daysMax: 5 },
  { prefix: "17", city: "Himachal Pradesh", state: "Himachal Pradesh", tier: "hill", daysMin: 4, daysMax: 6 },
  { prefix: "180", city: "Jammu", state: "Jammu and Kashmir", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "18", city: "Jammu and Kashmir", state: "Jammu and Kashmir", tier: "tier2", daysMin: 3, daysMax: 5 },
  { prefix: "190", city: "Srinagar", state: "Jammu and Kashmir", tier: "tier2", daysMin: 3, daysMax: 5 },
  { prefix: "194", city: "Leh Ladakh", state: "Ladakh", tier: "remote", daysMin: 5, daysMax: 7 },
  { prefix: "19", city: "Jammu and Kashmir / Ladakh", state: "Jammu and Kashmir", tier: "remote", daysMin: 4, daysMax: 6 },

  // ── 2xxx: Northern Zone 2 (Uttar Pradesh & Uttarakhand) ──
  { prefix: "201", city: "Noida / Ghaziabad", state: "Uttar Pradesh", tier: "ncr", daysMin: 1, daysMax: 2 },
  { prefix: "208", city: "Kanpur", state: "Uttar Pradesh", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "226", city: "Lucknow", state: "Uttar Pradesh", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "221", city: "Varanasi", state: "Uttar Pradesh", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "282", city: "Agra", state: "Uttar Pradesh", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "250", city: "Meerut", state: "Uttar Pradesh", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "211", city: "Prayagraj", state: "Uttar Pradesh", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "248", city: "Dehradun", state: "Uttarakhand", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "249", city: "Haridwar / Rishikesh", state: "Uttarakhand", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "263", city: "Nainital / Haldwani", state: "Uttarakhand", tier: "hill", daysMin: 3, daysMax: 5 },
  { prefix: "24", city: "Uttarakhand / UP", state: "Uttarakhand", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "26", city: "Uttarakhand", state: "Uttarakhand", tier: "hill", daysMin: 3, daysMax: 5 },
  { prefix: "20", city: "Uttar Pradesh", state: "Uttar Pradesh", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "22", city: "Uttar Pradesh", state: "Uttar Pradesh", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "23", city: "Uttar Pradesh", state: "Uttar Pradesh", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "27", city: "Gorakhpur / UP", state: "Uttar Pradesh", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "28", city: "Jhansi / UP", state: "Uttar Pradesh", tier: "tier3", daysMin: 3, daysMax: 4 },

  // ── 3xxx: Western Zone 1 (Rajasthan & Gujarat) ──
  { prefix: "302", city: "Jaipur", state: "Rajasthan", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "342", city: "Jodhpur", state: "Rajasthan", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "313", city: "Udaipur", state: "Rajasthan", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "324", city: "Kota", state: "Rajasthan", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "30", city: "Rajasthan", state: "Rajasthan", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "31", city: "Rajasthan", state: "Rajasthan", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "32", city: "Rajasthan", state: "Rajasthan", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "33", city: "Bikaner / Rajasthan", state: "Rajasthan", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "34", city: "Rajasthan", state: "Rajasthan", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "380", city: "Ahmedabad", state: "Gujarat", tier: "metro", daysMin: 1, daysMax: 2 },
  { prefix: "395", city: "Surat", state: "Gujarat", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "390", city: "Vadodara", state: "Gujarat", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "360", city: "Rajkot", state: "Gujarat", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "36", city: "Gujarat", state: "Gujarat", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "37", city: "Gandhinagar / Gujarat", state: "Gujarat", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "38", city: "Gujarat", state: "Gujarat", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "39", city: "Gujarat", state: "Gujarat", tier: "tier2", daysMin: 2, daysMax: 4 },

  // ── 4xxx: Western Zone 2 (Maharashtra, MP, Chhattisgarh, Goa) ──
  { prefix: "400", city: "Mumbai", state: "Maharashtra", tier: "metro", daysMin: 1, daysMax: 2 },
  { prefix: "401", city: "Thane / Navi Mumbai", state: "Maharashtra", tier: "metro", daysMin: 1, daysMax: 2 },
  { prefix: "411", city: "Pune", state: "Maharashtra", tier: "metro", daysMin: 1, daysMax: 2 },
  { prefix: "440", city: "Nagpur", state: "Maharashtra", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "422", city: "Nashik", state: "Maharashtra", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "431", city: "Chhatrapati Sambhajinagar", state: "Maharashtra", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "416", city: "Kolhapur", state: "Maharashtra", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "403", city: "Goa", state: "Goa", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "40", city: "Maharashtra", state: "Maharashtra", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "41", city: "Maharashtra", state: "Maharashtra", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "42", city: "Maharashtra", state: "Maharashtra", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "43", city: "Maharashtra", state: "Maharashtra", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "44", city: "Maharashtra", state: "Maharashtra", tier: "tier3", daysMin: 3, daysMax: 4 },

  // Madhya Pradesh (including 454553 Dhar)
  { prefix: "452", city: "Indore", state: "Madhya Pradesh", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "462", city: "Bhopal", state: "Madhya Pradesh", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "454", city: "Dhar / Malwa", state: "Madhya Pradesh", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "450", city: "Khandwa", state: "Madhya Pradesh", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "451", city: "Khargone", state: "Madhya Pradesh", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "453", city: "Mhow / Indore Rural", state: "Madhya Pradesh", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "455", city: "Dewas", state: "Madhya Pradesh", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "456", city: "Ujjain", state: "Madhya Pradesh", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "474", city: "Gwalior", state: "Madhya Pradesh", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "482", city: "Jabalpur", state: "Madhya Pradesh", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "486", city: "Rewa", state: "Madhya Pradesh", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "45", city: "Madhya Pradesh", state: "Madhya Pradesh", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "46", city: "Madhya Pradesh", state: "Madhya Pradesh", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "47", city: "Madhya Pradesh", state: "Madhya Pradesh", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "48", city: "Madhya Pradesh", state: "Madhya Pradesh", tier: "tier3", daysMin: 3, daysMax: 4 },

  // Chhattisgarh
  { prefix: "492", city: "Raipur", state: "Chhattisgarh", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "490", city: "Bhilai / Durg", state: "Chhattisgarh", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "495", city: "Bilaspur", state: "Chhattisgarh", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "49", city: "Chhattisgarh", state: "Chhattisgarh", tier: "tier3", daysMin: 3, daysMax: 4 },

  // ── 5xxx: Southern Zone 1 (Andhra Pradesh, Telangana, Karnataka) ──
  { prefix: "500", city: "Hyderabad", state: "Telangana", tier: "metro", daysMin: 1, daysMax: 2 },
  { prefix: "506", city: "Warangal", state: "Telangana", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "50", city: "Telangana", state: "Telangana", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "530", city: "Visakhapatnam", state: "Andhra Pradesh", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "520", city: "Vijayawada", state: "Andhra Pradesh", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "517", city: "Tirupati", state: "Andhra Pradesh", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "51", city: "Andhra Pradesh", state: "Andhra Pradesh", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "52", city: "Andhra Pradesh", state: "Andhra Pradesh", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "53", city: "Andhra Pradesh", state: "Andhra Pradesh", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "560", city: "Bengaluru", state: "Karnataka", tier: "metro", daysMin: 1, daysMax: 2 },
  { prefix: "570", city: "Mysuru", state: "Karnataka", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "575", city: "Mangaluru", state: "Karnataka", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "580", city: "Hubballi-Dharwad", state: "Karnataka", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "56", city: "Karnataka", state: "Karnataka", tier: "tier3", daysMin: 2, daysMax: 4 },
  { prefix: "57", city: "Karnataka", state: "Karnataka", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "58", city: "Karnataka", state: "Karnataka", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "59", city: "Belagavi / Karnataka", state: "Karnataka", tier: "tier3", daysMin: 3, daysMax: 4 },

  // ── 6xxx: Southern Zone 2 (Tamil Nadu, Kerala, Puducherry, Lakshadweep) ──
  { prefix: "600", city: "Chennai", state: "Tamil Nadu", tier: "metro", daysMin: 1, daysMax: 2 },
  { prefix: "641", city: "Coimbatore", state: "Tamil Nadu", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "625", city: "Madurai", state: "Tamil Nadu", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "620", city: "Tiruchirappalli", state: "Tamil Nadu", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "636", city: "Salem", state: "Tamil Nadu", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "605", city: "Puducherry", state: "Puducherry", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "60", city: "Tamil Nadu", state: "Tamil Nadu", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "61", city: "Tamil Nadu", state: "Tamil Nadu", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "62", city: "Tamil Nadu", state: "Tamil Nadu", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "63", city: "Tamil Nadu", state: "Tamil Nadu", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "64", city: "Tamil Nadu", state: "Tamil Nadu", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "682", city: "Kochi / Ernakulam", state: "Kerala", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "695", city: "Thiruvananthapuram", state: "Kerala", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "673", city: "Kozhikode", state: "Kerala", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "680", city: "Thrissur", state: "Kerala", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "67", city: "Kerala", state: "Kerala", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "68", city: "Kerala", state: "Kerala", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "69", city: "Kerala", state: "Kerala", tier: "tier3", daysMin: 3, daysMax: 4 },

  // ── 7xxx: Eastern Zone 1 (West Bengal, Odisha, Assam, NE, Andaman) ──
  { prefix: "700", city: "Kolkata", state: "West Bengal", tier: "metro", daysMin: 1, daysMax: 2 },
  { prefix: "711", city: "Howrah", state: "West Bengal", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "734", city: "Siliguri / Darjeeling", state: "West Bengal", tier: "hill", daysMin: 3, daysMax: 5 },
  { prefix: "713", city: "Durgapur / Asansol", state: "West Bengal", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "70", city: "West Bengal", state: "West Bengal", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "71", city: "West Bengal", state: "West Bengal", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "72", city: "West Bengal", state: "West Bengal", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "73", city: "West Bengal", state: "West Bengal", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "744", city: "Port Blair", state: "Andaman and Nicobar Islands", tier: "island", daysMin: 5, daysMax: 7 },
  { prefix: "74", city: "West Bengal", state: "West Bengal", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "751", city: "Bhubaneswar", state: "Odisha", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "753", city: "Cuttack", state: "Odisha", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "769", city: "Rourkela", state: "Odisha", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "75", city: "Odisha", state: "Odisha", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "76", city: "Odisha", state: "Odisha", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "77", city: "Odisha", state: "Odisha", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "781", city: "Guwahati", state: "Assam", tier: "tier1", daysMin: 2, daysMax: 4 },
  { prefix: "78", city: "Assam", state: "Assam", tier: "tier3", daysMin: 3, daysMax: 5 },
  { prefix: "737", city: "Gangtok", state: "Sikkim", tier: "hill", daysMin: 4, daysMax: 6 },
  { prefix: "793", city: "Shillong", state: "Meghalaya", tier: "hill", daysMin: 4, daysMax: 6 },
  { prefix: "795", city: "Imphal", state: "Manipur", tier: "remote", daysMin: 5, daysMax: 7 },
  { prefix: "796", city: "Aizawl", state: "Mizoram", tier: "remote", daysMin: 5, daysMax: 7 },
  { prefix: "797", city: "Kohima / Dimapur", state: "Nagaland", tier: "remote", daysMin: 5, daysMax: 7 },
  { prefix: "799", city: "Agartala", state: "Tripura", tier: "remote", daysMin: 5, daysMax: 7 },
  { prefix: "790", city: "Itanagar", state: "Arunachal Pradesh", tier: "remote", daysMin: 5, daysMax: 7 },
  { prefix: "791", city: "Itanagar / Naharlagun", state: "Arunachal Pradesh", tier: "remote", daysMin: 5, daysMax: 7 },
  { prefix: "792", city: "Arunachal Pradesh", state: "Arunachal Pradesh", tier: "remote", daysMin: 5, daysMax: 7 },
  { prefix: "79", city: "North East", state: "North East Region", tier: "remote", daysMin: 4, daysMax: 7 },

  // ── 8xxx: Eastern Zone 2 (Bihar & Jharkhand) ──
  { prefix: "800", city: "Patna", state: "Bihar", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "823", city: "Gaya", state: "Bihar", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "842", city: "Muzaffarpur", state: "Bihar", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "812", city: "Bhagalpur", state: "Bihar", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "834", city: "Ranchi", state: "Jharkhand", tier: "tier1", daysMin: 2, daysMax: 3 },
  { prefix: "831", city: "Jamshedpur", state: "Jharkhand", tier: "tier2", daysMin: 2, daysMax: 3 },
  { prefix: "826", city: "Dhanbad", state: "Jharkhand", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "827", city: "Bokaro", state: "Jharkhand", tier: "tier2", daysMin: 2, daysMax: 4 },
  { prefix: "80", city: "Bihar", state: "Bihar", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "81", city: "Bihar / Jharkhand", state: "Bihar", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "82", city: "Jharkhand / Bihar", state: "Jharkhand", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "83", city: "Jharkhand", state: "Jharkhand", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "84", city: "Bihar", state: "Bihar", tier: "tier3", daysMin: 3, daysMax: 4 },
  { prefix: "85", city: "Bihar", state: "Bihar", tier: "tier3", daysMin: 3, daysMax: 4 },
];

/**
 * Validates whether a given string is a valid 6-digit Indian PIN code.
 */
export const isValidIndianPincode = (pincode) => {
  const clean = String(pincode || "").trim();
  return /^[1-9]\d{5}$/.test(clean);
};

/**
 * Look up location and transit days for a 6-digit Indian PIN code.
 */
export const lookupPincode = (pincode) => {
  const clean = String(pincode || "").trim();
  if (!isValidIndianPincode(clean)) {
    return {
      valid: false,
      pincode: clean,
      error: "Please enter a valid 6-digit PIN code",
    };
  }

  // 1. Try exact 3-digit prefix match first
  const prefix3 = clean.substring(0, 3);
  let match = PINCODE_PREFIX_DIRECTORY.find((entry) => entry.prefix === prefix3);

  // 2. Try 2-digit prefix match if not found
  if (!match) {
    const prefix2 = clean.substring(0, 2);
    match = PINCODE_PREFIX_DIRECTORY.find((entry) => entry.prefix === prefix2);
  }

  // 3. Fallback for any standard 1-8 zone Indian postal code
  if (!match) {
    match = {
      prefix: clean.substring(0, 1),
      city: "Standard Delivery Hub",
      state: "India",
      tier: "tier3",
      daysMin: 3,
      daysMax: 4,
    };
  }

  return {
    valid: true,
    pincode: clean,
    city: match.city,
    state: match.state,
    location: `${match.city}, ${match.state}`,
    tier: match.tier,
    daysMin: match.daysMin,
    daysMax: match.daysMax,
    error: null,
  };
};

/**
 * Formats a relative delivery date from a given number of transit days.
 * E.g., if days === 1 => "Tomorrow, 10 Sept"
 * else => "Fri, 12 Sept"
 */
export const formatEstimatedDate = (days) => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + Number(days || 0));

  const dateStr = targetDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  if (days === 1) {
    return `Tomorrow, ${targetDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  }

  return dateStr;
};

/**
 * Calculates delivery estimation, charges, and location details based on Pincode and Commerce settings.
 */
export const calculatePincodeDelivery = (pincode, options = {}) => {
  const { price = 0, commerce = {} } = options;
  const lookup = lookupPincode(pincode);

  if (!lookup.valid) {
    return {
      valid: false,
      pincode: lookup.pincode,
      error: lookup.error,
    };
  }

  // Transit days derived from pincode tier
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
    tier: lookup.tier,
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
