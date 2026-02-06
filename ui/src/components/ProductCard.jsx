import {
  formatDate,
  formatPrice,
  getCurrencyCode,
  normalizeAvailability,
  normalizeDiscount,
} from "../utils";

export default function ProductCard({ item, onDelete, exchangeRates }) {
  const normalizedAvailability = normalizeAvailability(
    item.product.availability
  );
  const availabilityClass =
    normalizedAvailability === "In stock" ? "InStock" : normalizedAvailability;
  const currencyCode = getCurrencyCode(item.country);

  return (
    <article className="card">
      <div className="card-top">
        <span className={`badge ${item.platform.toLowerCase()}`}>
          {item.platform}
        </span>
        <div className="card-actions">
          <span className={`status ${availabilityClass}`}>
            {item.product.availability}
          </span>
          <button
            type="button"
            className="delete"
            onClick={() => onDelete(item)}
            aria-label="Delete product"
          >
            Delete
          </button>
        </div>
      </div>
      <h2>{item.product.title}</h2>
      <p className="url">{item.source_url}</p>

      <div className="price-row">
        <div>
          <p className="label">Price</p>
          <p className="price">
            {formatPrice(item.product.price, currencyCode, exchangeRates)}
          </p>
        </div>
        <div>
          <p className="label">MRP</p>
          <p className="price muted">
            {formatPrice(
              item.product.original_price,
              currencyCode,
              exchangeRates
            )}
          </p>
        </div>
        <div>
          <p className="label">Discount</p>
          <p className="price highlight">
            {normalizeDiscount(item.product.discount)}
          </p>
        </div>
      </div>

      <div className="offers">
        {item.product.bank_offers.length === 0 ? (
          <p className="empty">No bank offers captured.</p>
        ) : (
          item.product.bank_offers.map((offer, index) => (
            <span key={`${item.source_url}-${index}`} className="pill">
              {offer}
            </span>
          ))
        )}
      </div>

      <div className="meta">
        <span>Country: {item.country}</span>
        <span>Scraped: {formatDate(item.scraped_at)}</span>
      </div>

      <a className="link" href={item.source_url} target="_blank" rel="noreferrer">
        Open Source Page
      </a>
    </article>
  );
}
