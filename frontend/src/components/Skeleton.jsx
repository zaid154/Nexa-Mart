export function SkeletonLine({ width = "100%", height = 14, className = "" }) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{ width, height: typeof height === "number" ? `${height}px` : height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-thumb" />
      <div className="skeleton skeleton-line-md" />
      <div className="skeleton skeleton-line-sm" />
      <div className="skeleton skeleton-line-sm" style={{ width: "50%" }} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="skeleton-table" aria-label="Loading" role="status">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-row skeleton-row-inner">
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="skeleton skeleton-table-cell" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonHome() {
  return (
    <div aria-label="Loading homepage" role="status">
      <div className="skeleton skeleton-home-hero bleed-full" />
      <div className="skeleton skeleton-section-title" />
      <div className="product-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="skeleton skeleton-section-title mt-4" />
      <div className="product-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonDetail() {
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
}

export function SkeletonCart() {
  return (
    <div aria-label="Loading cart" role="status">
      <div className="skeleton skeleton-section-title" />
      <div className="cart-items-list">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="cart-line">
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
}

export default function Skeleton({ type = "line", ...props }) {
  if (type === "card") return <SkeletonCard {...props} />;
  if (type === "table") return <SkeletonTable {...props} />;
  if (type === "home") return <SkeletonHome {...props} />;
  if (type === "detail") return <SkeletonDetail {...props} />;
  if (type === "cart") return <SkeletonCart {...props} />;
  return <SkeletonLine {...props} />;
}
