import ProductCard from "./ProductCard";

export default function ProductGrid({
  items,
  onDelete,
  exchangeRates,
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <section className="product-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`skeleton-${index}`} className="card skeleton-card">
            <div className="skeleton-line w-24" />
            <div className="skeleton-line w-48" />
            <div className="skeleton-line w-40" />
            <div className="skeleton-row">
              <div className="skeleton-line w-16" />
              <div className="skeleton-line w-16" />
              <div className="skeleton-line w-16" />
            </div>
            <div className="skeleton-line w-32" />
            <div className="skeleton-line w-24" />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="product-grid">
      {items.map((item) => (
        <ProductCard
          key={`${item.source_url}-${item.scraped_at}`}
          item={item}
          onDelete={onDelete}
          exchangeRates={exchangeRates}
        />
      ))}
    </section>
  );
}
