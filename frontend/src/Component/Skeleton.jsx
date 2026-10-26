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
    <div className="card flex flex-col gap-2.5 overflow-hidden pb-4" aria-hidden="true">
      <div className="skeleton aspect-[4/3] rounded-none" />
      <div className="skeleton mx-4 h-4 w-3/4" />
      <div className="skeleton mx-4 h-3.5 w-1/2" />
      <div className="skeleton mx-4 h-3.5 w-1/3" />
    </div>
  );
};

// Placeholder for a table with the given number of rows and columns.
export const SkeletonTable = ({ rows = 5, cols = 4 }) => {
  // Build simple arrays we can loop over.
  const rowList = Array.from({ length: rows });
  const colList = Array.from({ length: cols });

  return (
    <div className="card divide-y divide-ink-100 overflow-hidden" aria-label="Loading" role="status">
      {rowList.map((item, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 px-4 py-3.5">
          {colList.map((cell, colIndex) => (
            <div key={colIndex} className="skeleton h-4 flex-1" />
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
    <div className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-20 pt-8 sm:px-6" aria-label="Loading homepage" role="status">
      <div className="skeleton h-[420px] rounded-2xl" />
      <div className="skeleton mb-6 mt-12 h-7 w-56" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
        {fourItems.map((item, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <div className="skeleton mb-6 mt-12 h-7 w-56" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
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
    <div className="grid gap-10 lg:grid-cols-2" aria-label="Loading product" role="status">
      <div className="skeleton aspect-square rounded-xl" />
      <div className="flex flex-col gap-4 pt-2">
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
      <div className="skeleton mb-6 h-7 w-56" />
      <div className="flex flex-col gap-3">
        {threeItems.map((item, index) => (
          <div key={index} className="card flex items-center gap-4 p-4">
            <div className="skeleton h-[100px] w-[100px] shrink-0" />
            <div className="flex flex-1 flex-col gap-2">
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
