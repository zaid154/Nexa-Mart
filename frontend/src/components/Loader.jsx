// A simple loading spinner. Pass full=true to center it on the page.
const Loader = ({ full = false }) => {
  let loaderClass = "flex items-center justify-center py-10";
  if (full) {
    loaderClass = "flex min-h-[60vh] flex-1 items-center justify-center";
  }

  return (
    <div className={loaderClass} role="status" aria-label="Loading">
      <div className="spinner" />
    </div>
  );
};

export default Loader;
