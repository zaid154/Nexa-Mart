// Green rating pill ("4.3 ★") with an optional review count next to it —
// the compact rating treatment used across listings and product pages.
const Rating = ({ value = 0, count, showCount = true }) => {
  if (!value) {
    return (
      <span className="inline-flex min-h-[18px] items-center text-xs text-ink-400">
        No ratings yet
      </span>
    );
  }

  return (
    <span className="inline-flex min-h-[18px] items-center gap-1.5" title={`${value} out of 5`}>
      <span className="rating-pill">
        {value.toFixed(1)} <span aria-hidden="true">★</span>
      </span>
      {showCount && count != null && (
        <span className="text-xs font-medium text-ink-400">({count})</span>
      )}
    </span>
  );
};

export default Rating;
