import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import ProductCard from "../components/ProductCard.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { SkeletonCard } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function Wishlist() {
  const { wishlist, loading } = useCart();

  if (loading) {
    return (
      <div>
        <div className="skeleton skeleton-section-title" />
        <div className="product-grid">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <EmptyState
        eyebrow="Saved items"
        title="Your wishlist is empty"
        message="Save products you love and come back to them anytime."
        icon="wishlist"
        action={<Link to="/products" className="btn">Discover products</Link>}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Saved items"
        title="My Wishlist"
        subtitle={`${wishlist.length} item${wishlist.length > 1 ? "s" : ""} saved for later`}
      />
      <div className="product-grid">
        {wishlist.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    </div>
  );
}
