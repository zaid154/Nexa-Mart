import { Link } from "react-router-dom";

export default function ErrorState({ title = "Something went wrong", message, onRetry, type = "error" }) {
  return (
    <div className="error-page card">
      <span className="eyebrow">{type === "network" ? "Network Error" : "Error"}</span>
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
}
