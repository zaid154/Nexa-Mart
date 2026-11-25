import { Link } from "react-router-dom";

// Shown when something goes wrong, with an optional "Try again" button.
const ErrorState = ({ title = "Something went wrong", message, onRetry, type = "error" }) => {
  // The small label at the top changes for network errors.
  let label = "Error";
  if (type === "network") {
    label = "Network Error";
  }

  return (
    <div className="card mx-auto my-10 flex w-full max-w-lg flex-col items-center px-8 py-14 text-center">
      <span className="eyebrow !text-danger">{label}</span>
      <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
      {message && <p className="mt-2 text-sm text-ink-500">{message}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
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
