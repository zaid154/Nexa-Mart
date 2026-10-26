import { Link } from "react-router-dom";
import { formatDate } from "../../utils/formatUtils.js";

export default function ProductReviews({
  reviews = [],
  user,
  reviewEligibility,
  reviewForm,
  setReviewForm,
  handleReviewSubmit,
  submittingReview,
  showReviewModal,
  setShowReviewModal,
}) {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
          Customer Reviews ({reviews.length})
        </h3>

        {/* Rate Product Button: Visible only if user has a DELIVERED order for this item */}
        {user && reviewEligibility?.eligible && (
          <button
            type="button"
            onClick={() => setShowReviewModal((s) => !s)}
            className="px-3 py-1 bg-[#2874f0] hover:bg-blue-600 text-white rounded text-xs font-bold transition-colors cursor-pointer"
          >
            {showReviewModal
              ? "Cancel"
              : reviewEligibility.existingReview
              ? "Edit Review"
              : "Rate Product"}
          </button>
        )}
      </div>

      {/* Eligibility Notice: Shown when user has NOT received delivery of this product */}
      {!reviewEligibility?.eligible && reviewEligibility?.checked && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-2xs text-slate-600 leading-relaxed flex items-start gap-2">
          <span className="text-emerald-600 font-bold shrink-0">🛡️</span>
          <div className="flex-1">
            {user ? (
              <span>
                Only verified customers whose orders have been <strong>Delivered</strong> can rate and review this product.
              </span>
            ) : (
              <span>
                Please{" "}
                <Link to="/login" className="text-[#2874f0] font-bold hover:underline">
                  sign in
                </Link>{" "}
                with an account that has received delivery of this product to leave a review.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Review Form for Verified Delivered Buyers */}
      {showReviewModal && user && reviewEligibility?.eligible && (
        <form
          onSubmit={handleReviewSubmit}
          className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col gap-2.5 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {reviewEligibility.existingReview ? "Edit Your Review" : "Write a Review"}
            </h4>
            <span className="text-3xs font-semibold text-[#388e3c] bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
              ✓ Verified Delivery
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">Rating:</span>
            <select
              value={reviewForm.rating}
              onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
              className="text-xs border border-slate-300 rounded px-2 py-1 bg-white font-medium focus:border-[#2874f0] focus:outline-none"
            >
              <option value={5}>5 ★ - Excellent</option>
              <option value={4}>4 ★ - Very Good</option>
              <option value={3}>3 ★ - Average</option>
              <option value={2}>2 ★ - Poor</option>
              <option value={1}>1 ★ - Terrible</option>
            </select>
          </div>

          <textarea
            rows={3}
            value={reviewForm.comment}
            onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
            placeholder="Share your honest feedback about this product..."
            required
            className="w-full text-xs p-2 rounded border border-slate-300 bg-white focus:border-[#2874f0] focus:outline-none"
          />

          <button
            type="submit"
            disabled={submittingReview}
            className="self-start px-4 py-1.5 bg-[#fb641b] hover:bg-[#e85a14] disabled:opacity-50 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            {submittingReview ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <p className="text-xs text-slate-400 py-3">No reviews yet for this product.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {reviews.map((r, i) => (
            <div key={r._id || i} className="py-2.5 flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-[#388e3c] text-white text-3xs font-bold px-1.5 py-0.5 rounded-xs">
                  {r.rating || 5} ★
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {r.name || "Certified Buyer"}
                </span>
                <span className="text-3xs text-[#388e3c] font-semibold">
                  ✓ Certified Buyer
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{r.comment}</p>
              <span className="text-3xs text-slate-400">
                Reviewed on {formatDate(r.createdAt || new Date())}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
