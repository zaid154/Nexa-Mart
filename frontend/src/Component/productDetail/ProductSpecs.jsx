export default function ProductSpecs({ description, specs }) {
  const hasSpecs = specs && typeof specs === "object" && Object.keys(specs).length > 0;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
          Product Description
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
          {description || "No description provided for this product."}
        </p>
      </div>

      {hasSpecs && (
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-2.5">
            Specifications
          </h3>
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
            {Object.entries(specs).map(([key, val]) => (
              <div key={key} className="grid grid-cols-12 text-xs">
                <div className="col-span-4 bg-slate-50 p-2 sm:p-2.5 font-medium text-slate-500">
                  {key}
                </div>
                <div className="col-span-8 p-2 sm:p-2.5 text-slate-800 font-medium">
                  {String(val)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
