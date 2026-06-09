import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconSearch } from "./Icons.jsx";

// Some common searches we suggest to the user.
const popularSearches = ["iPhone", "MacBook", "Samsung Galaxy", "Headphones", "Gaming laptop"];
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
        <button type="submit" className="search-bar-btn" aria-label="Submit search">
          Search
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <ul className="search-dropdown" role="listbox">
          {recent.length > 0 && (
            <li className="search-dropdown-label" role="presentation">Recent</li>
          )}
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.type}-${suggestion.label}`}
              role="option"
              aria-selected={index === activeIndex}
            >
              <button
                type="button"
                className={`search-dropdown-item ${index === activeIndex ? "active" : ""}`}
                onMouseDown={() => go(suggestion.label, suggestion.type === "category")}
              >
                <IconSearch size={14} />
                <span>{suggestion.label}</span>
                {suggestion.type === "category" && <span className="search-tag">Category</span>}
                {suggestion.type === "popular" && <span className="search-tag">Popular</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
