// A simple loading spinner. Pass full=true to center it on the page.
const Loader = ({ full = false }) => {
  let loaderClass = "loader";
  if (full) {
    loaderClass = "loader full";
  }

  return (
    <div className={loaderClass}>
      <div className="spinner" />
    </div>
  );
};

export default Loader;
