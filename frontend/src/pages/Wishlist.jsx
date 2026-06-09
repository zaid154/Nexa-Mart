import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import ProductCard from "../components/ProductCard.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { SkeletonCard } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";

// Page that shows the products the user has saved to their wishlist.
const Wishlist = () => {
  const { wishlist, loading } = useCart();

  // While loading, show placeholder skeleton cards.
  if (loading) {
    return (
      <div>
        <div className="skeleton skeleton-section-title" />
        <div className="product-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // If there is nothing saved, show an empty message.
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

  // Add an "s" to the word "item" when there is more than one.
  let itemWord = "item";
  if (wishlist.length > 1) {
    itemWord = "items";
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Saved items"
        title="My Wishlist"
        subtitle={`${wishlist.length} ${itemWord} saved for later`}
      />
      <div className="product-grid">
        {wishlist.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    </div>
  );
};

export default Wishlist;
