import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/apiClient.js";

// Store configuration loaded from the API once at start-up: branding, the
// commerce rules (tax, delivery, EMI…) and the editable page content.
//
// Nothing in the UI hardcodes a price rule or a piece of marketing copy — it
// all comes from here, which means the admin panel can change it without a
// code change or a redeploy.
const SettingsContext = createContext(null);

// The shape the storefront falls back to while the request is in flight, or if
// the API is unreachable. These are last-resort values only; the server's
// saved settings always win once they arrive.
const FALLBACK = {
  site: { name: "NexaMart", supportEmail: "" },
  social: {},
  storefront: { productBenefits: [], footerTagline: "", footerCredit: "", footerAddress: "" },
  commerce: {
    currency: "INR",
    taxRatePercent: 18,
    shippingFee: 99,
    freeShippingThreshold: 5000,
    deliveryDaysMin: 3,
    deliveryDaysMax: 5,
    emiMonths: 12,
    returnWindowDays: 7,
    lowStockThreshold: 10,
    sellerName: "",
    codEnabled: true,
    onlinePaymentEnabled: true,
    assuredMinRating: 4,
  },
  homepage: {
    categoryTiles: [],
    heroSlides: [],
    promoTiles: [],
    collections: [
      { title: "Best Sellers & Offers", category: "", sort: "rating", featured: true },
      { title: "New Arrivals", category: "", sort: "newest", featured: false },
      { title: "Top Rated Selection", category: "", sort: "rating", featured: false },
      { title: "Best of Laptops", category: "Laptops", sort: "newest", featured: false },
      { title: "Deals on Smartphones", category: "Smartphones", sort: "price_desc", featured: false },
      { title: "Headphones & Speakers", category: "Audio", sort: "rating", featured: false },
      { title: "Watches for every wrist", category: "Watches", sort: "rating", featured: false },
    ],
    trustBadges: [],
    couponStrip: { enabled: false },
  },
  productPage: { offers: [], serviceBadges: [] },
  search: { popularSearches: [], placeholder: "Search for products, brands and more..." },
};

export const useSettings = () => useContext(SettingsContext) || { settings: FALLBACK, ready: false };

// Shortcut for the commerce rules, which most pages need on their own.
export const useCommerce = () => {
  const { settings } = useSettings();
  return settings.commerce;
};

const CACHE_KEY = "nexamart_settings";

// Merge API settings with default fallback values
const merge = (data) => ({
  site: { ...FALLBACK.site, ...(data.site || {}) },
  social: data.social || FALLBACK.social,
  storefront: { ...FALLBACK.storefront, ...(data.storefront || {}) },
  commerce: { ...FALLBACK.commerce, ...(data.commerce || {}) },
  homepage: { ...FALLBACK.homepage, ...(data.homepage || {}) },
  productPage: { ...FALLBACK.productPage, ...(data.productPage || {}) },
  search: { ...FALLBACK.search, ...(data.search || {}) },
});

// Initialize from session cache for instant initial render
const cached = (() => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? merge(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
})();

// Pre-fetch settings early during module initialization
const bootRequest = api.get("/admin/settings/public").catch(() => null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(cached || FALLBACK);
  const [ready, setReady] = useState(Boolean(cached));

  const load = useCallback((request) => {
    const pending = request || api.get("/admin/settings/public").catch(() => null);

    return pending
      .then((res) => {
        if (!res?.data) {
          return;
        }
        setSettings(merge(res.data));
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(res.data));
        } catch {
          // A full or disabled sessionStorage is not worth failing over.
        }
      })
      // A settings failure must never take the storefront down — the fallback
      // keeps every page renderable.
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    // Use the request that started at module load; revalidating in the
    // background is what makes the cached first paint safe.
    load(bootRequest);
  }, [load]);

  const value = useMemo(
    () => ({ settings, ready, reload: () => load() }),
    [settings, ready, load]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export default SettingsContext;
