import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import api from "../api/client.js";
import Loader from "../components/Loader.jsx";
import ErrorState from "../components/ErrorState.jsx";

// Renders an admin-managed CMS content page (About, Contact, Privacy, etc.).
const StaticPage = () => {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get(`/pages/${slug}`)
      .then((res) => setPage(res.data.page))
      .catch((err) => setError(err.message || "Page not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <Loader />;
  }
  if (error || !page) {
    return (
      <ErrorState
        title="Page not found"
        message={error || "This page does not exist."}
      />
    );
  }

  // Sanitize admin-authored HTML to prevent XSS attacks. DOMPurify strips
  // dangerous tags (<script>, <iframe>, event handlers etc.) while keeping
  // safe formatting elements (headings, paragraphs, links, lists, etc.).
  const cleanHTML = DOMPurify.sanitize(page.content, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr",
      "ul", "ol", "li", "a", "strong", "em", "b", "i", "u",
      "code", "pre", "blockquote", "img", "span", "div", "table",
      "thead", "tbody", "tr", "th", "td",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "class", "style"],
  });

  return (
    <div className="animate-fade-in mx-auto max-w-3xl">
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-ink-400" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-accent-600">Home</Link>
        <span aria-hidden="true">›</span>
        <span className="font-medium text-ink-700">{page.title}</span>
      </nav>
      <article className="card p-6 sm:p-8">
        <h1 className="mb-5 text-2xl font-bold text-ink-900 sm:text-3xl">{page.title}</h1>
        <div
          className="page-content text-[15px] leading-relaxed text-ink-600"
          dangerouslySetInnerHTML={{ __html: cleanHTML }}
        />
      </article>
    </div>
  );
};

export default StaticPage;
