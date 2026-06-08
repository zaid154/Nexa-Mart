import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconSearch } from "./Icons.jsx";

const POPULAR = ["iPhone", "MacBook", "Samsung Galaxy", "Headphones", "Gaming laptop"];
const RECENT_KEY = "nexamart_recent_searches";

function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(term) {
  const recent = getRecent().filter((r) => r !== term);
  recent.unshift(term);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 5)));
}

export default function SearchBar({ categories = [], className = "", onNavigate }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState(getRecent);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const suggestions = [
    ...recent.map((r) => ({ type: "recent", label: r })),
    ...POPULAR.filter((p) => !recent.includes(p)).map((p) => ({ type: "popular", label: p })),
    ...categories.slice(0, 4).map((c) => ({ type: "category", label: c })),
  ].slice(0, 8);

  const go = (value, isCategory = false) => {
    if (!value) return;
    if (!isCategory) saveRecent(value);
    setRecent(getRecent());
    setOpen(false);
    setTerm("");
    onNavigate?.();
    if (isCategory) {
      navigate(`/products?category=${encodeURIComponent(value)}`);
    } else {
      navigate(`/products?keyword=${encodeURIComponent(value)}`);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    go(term.trim());
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const s = suggestions[activeIndex];
      go(s.label, s.type === "category");
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={`search-bar ${className}`.trim()} ref={wrapRef}>
      <form className="search-bar-form" onSubmit={onSubmit} role="search">
        <span className="search-bar-icon" aria-hidden="true">
          <IconSearch size={18} />
        </span>
        <input
          className="search-bar-input"
          type="search"
          placeholder="Search electronics..."
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          aria-label="Search products"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        <button type="submit" className="search-bar-btn" aria-label="Submit search">
          Search
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <ul className="search-dropdown" role="listbox">
          {recent.length > 0 && (
            <li className="search-dropdown-label" role="presentation">Recent</li>
          )}
          {suggestions.map((s, i) => (
            <li key={`${s.type}-${s.label}`} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                className={`search-dropdown-item ${i === activeIndex ? "active" : ""}`}
                onMouseDown={() => go(s.label, s.type === "category")}
              >
                <IconSearch size={14} />
                <span>{s.label}</span>
                {s.type === "category" && <span className="search-tag">Category</span>}
                {s.type === "popular" && <span className="search-tag">Popular</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
