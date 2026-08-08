import { Link } from "react-router-dom";
import { Icon404 } from "../components/Icons.jsx";

// Page shown when the URL does not match any route (404).
const NotFound = () => {
  return (
    <div className="mx-auto flex max-w-lg animate-fade-in flex-col items-center gap-4 bg-white px-8 py-16 text-center shadow-card">
      <div className="text-accent-500" aria-hidden="true">
        <Icon404 />
      </div>
      <h1 className="text-xl font-bold text-ink-900">Unfortunately, this page is missing</h1>
      <p className="max-w-md text-sm text-ink-500">
        The page you&apos;re looking for has been moved, deleted, or never existed.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className="btn">Go to Homepage</Link>
        <Link to="/products" className="btn btn-outline">Browse products</Link>
      </div>
    </div>
  );
};

export default NotFound;
