import { Link } from "react-router-dom";
import { Icon404 } from "../components/Icons.jsx";

// Page shown when the URL does not match any route (404).
const NotFound = () => {
  return (
    <div className="error-page">
      <Icon404 />
      <span className="eyebrow">Error 404</span>
      <h1>Page not found</h1>
      <p className="muted mb-4">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="row gap-3">
        <Link to="/" className="btn">Back home</Link>
        <Link to="/products" className="btn btn-outline">Browse products</Link>
      </div>
    </div>
  );
};

export default NotFound;
