export default function Rating({ value = 0, count, showCount = true }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;

  return (
    <span className="rating" title={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        if (i <= full) return <span key={i}>★</span>;
        if (i === full + 1 && half) return <span key={i}>⯨</span>;
        return (
          <span key={i} className="rating-empty">
            ★
          </span>
        );
      })}
      {showCount && <span className="count">{count != null ? `(${count})` : value.toFixed(1)}</span>}
    </span>
  );
}
