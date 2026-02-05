export default function FetchForm({
  formUrl,
  formPlatform,
  formCountry,
  countryOptions,
  isSubmitting,
  submitError,
  submitSuccess,
  onUrlChange,
  onPlatformChange,
  onCountryChange,
  onSubmit,
}) {
  return (
    <section className="fetch">
      <div>
        <h2>Fetch by Product Link</h2>
        <p>
          Paste a product URL, select platform and country, and we’ll call the
          backend scraper API.
        </p>
      </div>
      <form onSubmit={onSubmit} className="fetch-form">
        <label>
          Product Link
          <input
            value={formUrl}
            onChange={onUrlChange}
            placeholder="https://amzn.in/..."
          />
        </label>
        <label>
          Platform
          <select value={formPlatform} onChange={onPlatformChange}>
            <option value="Amazon">Amazon</option>
            <option value="flipkart">flipkart</option>
            <option value="Reliance">Reliance</option>
          </select>
        </label>
        <label>
          Country
          <select value={formCountry} onChange={onCountryChange}>
            {countryOptions.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Fetching..." : "Fetch Product"}
        </button>
        {submitError ? (
          <p className="form-message error">{submitError}</p>
        ) : null}
        {submitSuccess ? (
          <p className="form-message success">{submitSuccess}</p>
        ) : null}
      </form>
    </section>
  );
}
