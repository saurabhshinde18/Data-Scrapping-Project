export default function HeroStats({ stats }) {
  return (
    <header className="hero">
      <div>
        <p className="eyebrow">Data Scraping Project</p>
        <h1>Product Snapshot Explorer</h1>
        <p className="subhead">
          A clean view of scraped Amazon and Flipkart product captures,
          optimized for quick QA and market checks.
        </p>
      </div>
      <div className="hero-card">
        <div>
          <p className="card-label">Total Products</p>
          <p className="card-value">{stats.total}</p>
        </div>
        <div>
          <p className="card-label">In Stock</p>
          <p className="card-value">{stats.inStock}</p>
        </div>
        <div>
          <p className="card-label">Blocked</p>
          <p className="card-value">{stats.blocked}</p>
        </div>
      </div>
    </header>
  );
}
