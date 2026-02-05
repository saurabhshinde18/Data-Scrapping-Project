import ProductCard from "./ProductCard";

export default function ProductGrid({ items, onDelete }) {
  return (
    <section className="grid">
      {items.map((item) => (
        <ProductCard
          key={item.source_url}
          item={item}
          onDelete={onDelete}
        />
      ))}
    </section>
  );
}
