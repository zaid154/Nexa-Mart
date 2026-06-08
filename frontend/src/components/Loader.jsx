export default function Loader({ full = false }) {
  return (
    <div className={`loader ${full ? "full" : ""}`}>
      <div className="spinner" />
    </div>
  );
}
