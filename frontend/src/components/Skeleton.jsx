// "Skeletons" are the grey placeholder shapes shown while data is loading.

// A single grey line.
export const SkeletonLine = ({ width = "100%", height = 14, className = "" }) => {
  // Height can be a number (pixels) or a string like "50%".
  let heightValue;
  if (typeof height === "number") {
    heightValue = `${height}px`;
  } else {
    heightValue = height;
  }

  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{ width: width, height: heightValue }}
      aria-hidden="true"
    />
  );
};

// Placeholder for one product card.
export const SkeletonCard = () => {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-thumb" />
      <div className="skeleton skeleton-line-md" />
      <div className="skeleton skeleton-line-sm" />
      <div className="skeleton skeleton-line-sm" style={{ width: "50%" }} />
    </div>
  );
};

// Placeholder for a table with the given number of rows and columns.
export const SkeletonTable = ({ rows = 5, cols = 4 }) => {
  // Build simple arrays we can loop over.
  const rowList = Array.from({ length: rows });
  const colList = Array.from({ length: cols });

  return (
    <div className="skeleton-table" aria-label="Loading" role="status">
      {rowList.map((item, rowIndex) => (
        <div key={rowIndex} className="skeleton-row skeleton-row-inner">
          {colList.map((cell, colIndex) => (
            <div key={colIndex} className="skeleton skeleton-table-cell" />
          ))}
        </div>
      ))}
    </div>
  );
};

// Placeholder for the home page.
export const SkeletonHome = () => {
  const fourItems = Array.from({ length: 4 });

  return (
    <div aria-label="Loading homepage" role="status">
      <div className="skeleton skeleton-home-hero bleed-full" />
      <div className="skeleton skeleton-section-title" />
      <div className="product-grid">
        {fourItems.map((item, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <div className="skeleton skeleton-section-title mt-4" />
      <div className="product-grid">
        {fourItems.map((item, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </div>
  );
};

// Placeholder for a single product detail page.
export const SkeletonDetail = () => {
  return (
    <div className="detail detail-loading" aria-label="Loading product" role="status">
      <div className="skeleton-card">
        <div className="skeleton" style={{ aspectRatio: "1", borderRadius: "var(--radius-lg)" }} />
      </div>
      <div className="detail-skeleton-info">
        <SkeletonLine height={20} width="30%" />
        <SkeletonLine height={36} width="70%" />
        <SkeletonLine height={28} width="40%" />
        <SkeletonLine height={16} width="90%" />
        <SkeletonLine height={16} width="80%" />
        <SkeletonLine height={44} width="60%" />
      </div>
    </div>
  );
};

// Placeholder for the cart page.
export const SkeletonCart = () => {
  const threeItems = Array.from({ length: 3 });

  return (
    <div aria-label="Loading cart" role="status">
      <div className="skeleton skeleton-section-title" />
      <div className="cart-items-list">
        {threeItems.map((item, index) => (
          <div key={index} className="cart-line">
            <div className="skeleton" style={{ width: 100, height: 100, borderRadius: "var(--radius)" }} />
            <div className="stack-sm flex-1">
              <SkeletonLine height={18} width="60%" />
              <SkeletonLine height={14} width="30%" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main component: picks which skeleton to show based on the "type".
const Skeleton = ({ type = "line", ...props }) => {
  if (type === "card") {
    return <SkeletonCard {...props} />;
  }
  if (type === "table") {
    return <SkeletonTable {...props} />;
  }
  if (type === "home") {
    return <SkeletonHome {...props} />;
  }
  if (type === "detail") {
    return <SkeletonDetail {...props} />;
  }
  if (type === "cart") {
    return <SkeletonCart {...props} />;
  }
  return <SkeletonLine {...props} />;
};

export default Skeleton;
