import { Link } from "react-router-dom";

// Shown when something goes wrong, with an optional "Try again" button.
const ErrorState = ({ title = "Something went wrong", message, onRetry, type = "error" }) => {
  // The small label at the top changes for network errors.
  let label = "Error";
  if (type === "network") {
    label = "Network Error";
  }

  return (
    <div className="error-page card">
      <span className="eyebrow">{label}</span>
      <h1 className="big">{title}</h1>
      {message && <p className="muted mb-4">{message}</p>}
      <div className="row gap-3">
        {onRetry && (
          <button type="button" className="btn" onClick={onRetry}>
            Try again
          </button>
        )}
        <Link to="/" className="btn btn-outline">Back home</Link>
      </div>
    </div>
  );
};

export default ErrorState;
