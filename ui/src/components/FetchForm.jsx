export default function FetchForm({
  formPlatform,
  formCountry,
  searchQuery,
  countryOptions,
  isSearching,
  searchError,
  searchSuccess,
  onPlatformChange,
  onCountryChange,
  onSearchQueryChange,
  onSearch,
}) {
  return (
    <section className="fetch">
      <div>
        <h2>Fetch by Product Name</h2>
        <p>
          Enter a product name, select platform and country, and will   search
          and scrape top results.
        </p>
      </div>
      <form onSubmit={(event) => event.preventDefault()} className="fetch-form">
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
        <label>
          Product Name
          <input
            value={searchQuery}
            onChange={onSearchQueryChange}
            placeholder="Search phones, laptops, headphones..."
          />
        </label>
        <button type="button" onClick={onSearch} disabled={isSearching}>
          {isSearching ? "Fetching..." : "Fetch Products"}
        </button>
        {searchError ? (
          <p className="form-message error">{searchError}</p>
        ) : null}
        {searchSuccess ? (
          <p className="form-message success">{searchSuccess}</p>
        ) : null}
      </form>
    </section>
  );
}
