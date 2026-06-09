// Shows a star rating from 0 to 5, with an optional review count.
const Rating = ({ value = 0, count, showCount = true }) => {
  // Number of full stars.
  const fullStars = Math.floor(value);
  // Whether we should show a half star after the full ones.
  const hasHalfStar = value - fullStars >= 0.5;

  // Decide which symbol to show for each of the 5 star positions.
  const renderStar = (position) => {
    if (position <= fullStars) {
      return <span key={position}>★</span>;
    }
    if (position === fullStars + 1 && hasHalfStar) {
      return <span key={position}>⯨</span>;
    }
    return (
      <span key={position} className="rating-empty">
        ★
      </span>
    );
  };

  // Decide what text to show next to the stars.
  let countText;
  if (count != null) {
    countText = `(${count})`;
  } else {
    countText = value.toFixed(1);
  }

  return (
    <span className="rating" title={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((position) => renderStar(position))}
      {showCount && <span className="count">{countText}</span>}
    </span>
  );
};

export default Rating;
