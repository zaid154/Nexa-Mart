import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import { SocialIcon } from "./SocialIcon.jsx";
import { useSettings } from "../context/SettingsContext.jsx";

// The social media links we can show.
const socialLinks = [
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter / X" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "github", label: "GitHub" },
];

// Which CMS pages count as "policy" pages (shown in a separate column).
const POLICY_SLUGS = ["privacy", "terms", "shipping", "returns", "refund", "cancellation"];

const colTitle = "mb-3 text-2xs font-normal uppercase tracking-[0.1em] text-ink-400";
const colLink = "block py-[3px] text-[13px] text-white/90 transition-colors hover:underline";

// Generic payment-method glyphs (no brand marks) for the bottom bar.
const PaymentGlyph = ({ label }) => (
  <span
    title={label}
    className="grid h-5 w-8 place-items-center rounded-[3px] bg-white/90 text-[8px] font-black uppercase tracking-tight text-ink-700"
  >
    {label}
  </span>
);

const Footer = () => {
  // Settings come from the provider. The footer used to fetch
  // /admin/settings/public itself, which meant every page load asked for the
  // same document twice and kept two copies of it in state.
  const { settings } = useSettings();
  const site = settings.site;
  const social = settings.social || {};
  const storefront = settings.storefront || {};

  const [pages, setPages] = useState([]);

  // The CMS pages are the footer's own data, so it still loads those.
  useEffect(() => {
    api
      .get("/pages")
      .then((res) => setPages(res.data.pages || []))
      .catch(() => {});
  }, []);

  const activeSocial = socialLinks.filter((item) => social[item.key]);
  const companyPages = pages.filter((p) => !POLICY_SLUGS.includes(p.slug));
  const policyPages = pages.filter((p) => POLICY_SLUGS.includes(p.slug));

  const currentYear = new Date().getFullYear();
  const brand = site.name || "NexaMart";
  const supportEmail = site.supportEmail || "support@nexamart.com";
  const tagline =
    storefront.footerTagline ||
    "Your destination for premium electronics. Genuine products, secure payments, and fast delivery across India.";
  const credit = storefront.footerCredit || "";

  return (
    <footer className="mt-auto bg-footer text-white/90">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <h4 className={colTitle}>About</h4>
            <Link to="/page/about" className={colLink}>
              About Us
            </Link>
            <Link to="/page/contact" className={colLink}>
              Contact Us
            </Link>
            <Link to="/products" className={colLink}>
              All Products
            </Link>
            <Link to="/products?featured=true" className={colLink}>
              Best Sellers
            </Link>
          </div>

          <div>
            <h4 className={colTitle}>Help</h4>
            <Link to="/orders" className={colLink}>
              Track Order
            </Link>
            <Link to="/page/shipping" className={colLink}>
              Shipping
            </Link>
            <Link to="/page/returns" className={colLink}>
              Returns
            </Link>
            <a href={`mailto:${supportEmail}`} className={colLink}>
              24x7 Customer Care
            </a>
          </div>

          <div>
            <h4 className={colTitle}>Consumer Policy</h4>
            {policyPages.length > 0 ? (
              policyPages.map((p) => (
                <Link key={p.slug} to={`/page/${p.slug}`} className={colLink}>
                  {p.title}
                </Link>
              ))
            ) : (
              <>
                <Link to="/page/terms" className={colLink}>
                  Terms of Use
                </Link>
                <Link to="/page/privacy" className={colLink}>
                  Privacy Policy
                </Link>
              </>
            )}
            {companyPages.slice(0, 2).map((p) => (
              <Link key={p.slug} to={`/page/${p.slug}`} className={colLink}>
                {p.title}
              </Link>
            ))}
          </div>

          <div>
            <h4 className={colTitle}>Social</h4>
            <div className="flex flex-wrap gap-2">
              {activeSocial.length === 0 ? (
                <span className="text-[13px] text-white/50">Coming soon</span>
              ) : (
                activeSocial.map((item) => (
                  <a
                    key={item.key}
                    href={social[item.key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    title={item.label}
                    className="grid h-9 w-9 place-items-center rounded-sm border border-white/20 text-white/80 transition-colors hover:border-accent-400 hover:bg-accent-500 hover:text-white"
                  >
                    <SocialIcon name={item.key} size={17} />
                  </a>
                ))
              )}
            </div>
          </div>

          <div className="md:col-span-3 lg:col-span-1 lg:border-l lg:border-white/15 lg:pl-8">
            <h4 className={colTitle}>Mail Us</h4>
            <p className="max-w-xs text-[13px] leading-relaxed text-white/70">
              {brand} Retail Pvt Ltd,
              <br />
              Tower B, Tech Park, Andheri East,
              <br />
              Mumbai, Maharashtra 400093, India
            </p>
            <a
              href={`mailto:${supportEmail}`}
              className="mt-2.5 block text-[13px] text-white/90 hover:underline"
            >
              {supportEmail}
            </a>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-white/60">{tagline}</p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/15">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 py-4 text-[13px] sm:px-6">
          <div className="flex flex-wrap items-center gap-5 text-white/90">
            <Link to="/page/sell" className="hover:underline">
              Become a Seller
            </Link>
            <Link to="/products?featured=true" className="hover:underline">
              Advertise
            </Link>
            <Link to="/page/contact" className="hover:underline">
              Help Center
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <PaymentGlyph label="UPI" />
            <PaymentGlyph label="Visa" />
            <PaymentGlyph label="MC" />
            <PaymentGlyph label="Rupay" />
            <PaymentGlyph label="COD" />
          </div>
          <span className="text-white/70">
            &copy; {currentYear} {brand}
            <span className="ml-2">
              · Portfolio Project by{" "}
              <a
                href="https://github.com/zaid154"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-white hover:underline"
              >
                Mohd Zaid
              </a>{" "}
              (
              <a
                href="https://github.com/zaid154"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:underline"
              >
                GitHub
              </a>{" "}
              |{" "}
              <a
                href="https://www.linkedin.com/in/mohd-zaid-794090231/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:underline"
              >
                LinkedIn
              </a>
              )
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
