import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconSearch } from "./Icons.jsx";
import { useSettings } from "../context/SettingsContext.jsx";

// The key we use to save recent searches in the browser.
const recentKey = "nexamart_recent_searches";

// Read the recent searches saved in the browser.
const getRecent = () => {
  try {
    const saved = localStorage.getItem(recentKey) || "[]";
    return JSON.parse(saved);
  } catch {
    return [];
  }
};

// Save a search term to the top of the recent list (keep only 5).
const saveRecent = (term) => {
  const recent = getRecent().filter((item) => item !== term);
  recent.unshift(term);
  localStorage.setItem(recentKey, JSON.stringify(recent.slice(0, 5)));
};

const SearchBar = ({ categories = [], className = "", onNavigate }) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  // Suggestions and the placeholder are admin-configurable.
  const popularSearches = settings.search.popularSearches || [];
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState(getRecent);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);

  // Close the dropdown when the user clicks outside of it.
  useEffect(() => {
    const handleClick = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Build the list of suggestions: recent, then popular, then a few categories.
  const recentItems = recent.map((item) => ({ type: "recent", label: item }));
  const popularItems = popularSearches
    .filter((item) => !recent.includes(item))
    .map((item) => ({ type: "popular", label: item }));
  const categoryItems = categories
    .slice(0, 4)
    .map((item) => ({ type: "category", label: item }));
  const suggestions = [...recentItems, ...popularItems, ...categoryItems].slice(0, 8);

  // Go to the products page for the given search value.
  const go = (value, isCategory = false) => {
    if (!value) {
      return;
    }
    if (!isCategory) {
      saveRecent(value);
    }
    setRecent(getRecent());
    setOpen(false);
    setTerm("");
    if (onNavigate) {
      onNavigate();
    }
    if (isCategory) {
      navigate(`/products?category=${encodeURIComponent(value)}`);
    } else {
      navigate(`/products?keyword=${encodeURIComponent(value)}`);
    }
  };

  // When the user presses the search button or hits Enter in the box.
  const onSubmit = (event) => {
    event.preventDefault();
    go(term.trim());
  };

  // Handle the arrow keys, Enter and Escape inside the search box.
  const onKeyDown = (event) => {
    if (!open) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const selected = suggestions[activeIndex];
      go(selected.label, selected.type === "category");
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`.trim()} ref={wrapRef}>
      <form className="relative flex items-center" onSubmit={onSubmit} role="search">
        <span className="pointer-events-none absolute left-3.5 text-ink-400" aria-hidden="true">
          <IconSearch size={17} />
        </span>
        <input
          className="h-10 sm:h-11 w-full rounded-sm border-0 bg-white pl-9 sm:pl-10 pr-11 sm:pr-24 text-xs sm:text-sm text-ink-900 placeholder:text-ink-400 shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-copper-400"
          type="search"
          placeholder={settings.search.placeholder}
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          aria-label="Search products"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        <button
          type="submit"
          className="absolute right-1 sm:right-1.5 rounded-sm bg-accent-500 px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-accent-600 flex items-center justify-center gap-1"
          aria-label="Submit search"
        >
          <span className="hidden sm:inline">Search</span>
          <IconSearch size={14} className="sm:hidden" />
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <ul
          className="absolute inset-x-0 top-full z-30 mt-1 animate-scale-in rounded-sm border border-ink-100 bg-white p-1.5 shadow-deep"
          role="listbox"
        >
          {recent.length > 0 && (
            <li
              className="px-3 pb-1 pt-1.5 text-2xs font-bold uppercase tracking-wider text-ink-400"
              role="presentation"
            >
              Recent
            </li>
          )}
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.type}-${suggestion.label}`}
              role="option"
              aria-selected={index === activeIndex}
            >
              <button
                type="button"
                className={`flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-sm text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900 ${
                  index === activeIndex ? "bg-ink-50 text-ink-900" : ""
                }`}
                onMouseDown={() => go(suggestion.label, suggestion.type === "category")}
              >
                <span className="text-ink-400">
                  <IconSearch size={14} />
                </span>
                <span className="truncate">{suggestion.label}</span>
                {suggestion.type === "category" && <span className="badge ml-auto">Category</span>}
                {suggestion.type === "popular" && <span className="badge ml-auto">Popular</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
