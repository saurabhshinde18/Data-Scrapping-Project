import ProductCard from "./ProductCard";

export default function ProductGrid({ items, onDelete, exchangeRates }) {
  return (
    <section className="grid">
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
