import { useEffect, useMemo, useState } from "react";
import Filters from "./components/Filters";
import FetchForm from "./components/FetchForm";
import HeroStats from "./components/HeroStats";
import ProductGrid from "./components/ProductGrid";
import { COUNTRY_OPTIONS, normalizeAvailability } from "./utils";

const API_BASE = "http://127.0.0.1:8000/product";
const PLATFORM_OPTIONS = ["All", "Amazon", "flipkart", "Reliance"];
const AVAILABILITY_OPTIONS = ["All", "In stock", "Other"];

const readJson = async (url, options) => {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { response, data };
};

const isBotProtectionItem = (item) => {
  const title = String(item?.product?.title || "").toLowerCase();
  const availability = String(item?.product?.availability || "").toLowerCase();
  const discount = String(item?.product?.discount || "").toLowerCase();
  return (
    title.includes("bot protection") ||
    availability.includes("bot") ||
    availability.includes("blocked") ||
    availability.includes("protected") ||
    discount.includes("bot protection") ||
    discount.includes("site blocked")
  );
};

const isEmptyProductItem = (item) => {
  const product = item?.product || {};
  const title = String(product.title || "").trim();
  const price = String(product.price || "").trim();
  const originalPrice = String(product.original_price || "").trim();
  const discount = String(product.discount || "").trim();
  const availability = String(product.availability || "").trim();
  const bankOffers = Array.isArray(product.bank_offers)
    ? product.bank_offers.filter(Boolean)
    : [];

  return (
    !title &&
    !price &&
    !originalPrice &&
    !discount &&
    !availability &&
    bankOffers.length === 0
  );
};

const isSameEntry = (a, b) =>
  a?.source_url === b?.source_url && a?.scraped_at === b?.scraped_at;

export default function App() {
  const [products, setProducts] = useState([]);
  const [platform, setPlatform] = useState("All");
  const [availability, setAvailability] = useState("All");
  const [formPlatform, setFormPlatform] = useState("Amazon");
  const [formCountry, setFormCountry] = useState("India");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchSuccess, setSearchSuccess] = useState("");
  const [exchangeRates, setExchangeRates] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const filtered = useMemo(() => {
    return products.filter((item) => {
      if (isBotProtectionItem(item)) return false;
      if (isEmptyProductItem(item)) return false;
      const matchesPlatform =
        platform === "All" || item.platform === platform;
      const normalizedAvailability = normalizeAvailability(
        item.product.availability
      );
      const matchesAvailability =
        availability === "All" ||
        (availability === "Other"
          ? normalizedAvailability === "Other"
          : normalizedAvailability === availability);

      return matchesPlatform && matchesAvailability;
    });
  }, [platform, availability, products]);

  useEffect(() => {
    const load = async () => {
      try {
        const { response, data: files } = await readJson(`${API_BASE}/files`);
        if (!response.ok || !Array.isArray(files)) return;

        const fileResponses = await Promise.all(
          files.map((path) =>
            readJson(`${API_BASE}/file`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path }),
            })
          )
        );

        const loaded = fileResponses
          .map(({ data }) => data)
          .filter(Boolean);

        if (loaded.length > 0) setProducts(loaded);
      } catch (error) {
        // Keep seed data if API is unavailable.
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!COUNTRY_OPTIONS.includes(formCountry)) {
      setFormCountry(COUNTRY_OPTIONS[0]);
    }
  }, [formCountry]);

  useEffect(() => {
    const loadRates = async () => {
      try {
        const { response, data } = await readJson(
          "https://api.exchangerate.host/latest?base=INR"
        );
        if (!response.ok || !data?.rates) return;
        setExchangeRates(data.rates);
      } catch (error) {
        // Ignore rate errors; fallback stays in INR.
      }
    };
    loadRates();
  }, []);

  const stats = useMemo(() => {
    const sourceItems =
      searchResults.length > 0
        ? searchResults.flatMap((group) => group.items)
        : filtered;

    const total = sourceItems.length;
    const inStock = sourceItems.filter((item) =>
      String(item.product.availability || "")
        .toLowerCase()
        .includes("in stock")
    ).length;

    return { total, inStock };
  }, [searchResults, filtered]);

  const handleSearch = async () => {
    setSearchError("");
    setSearchSuccess("");
    setSearchResults([]);

    if (!searchQuery.trim()) {
      setSearchError("Please enter a product name to search.");
      return;
    }

    setIsSearching(true);
    try {
      const { response, data } = await readJson(`${API_BASE}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery.trim(),
          platform: formPlatform,
          country: formCountry,
          limit: 9,
        }),
      });

      if (!response.ok) {
        const message =
          data?.detail ||
          data?.message ||
          `Request failed (${response.status})`;
        throw new Error(message);
      }

      if (!data || !Array.isArray(data.results)) {
        throw new Error("API returned an unexpected response.");
      }

      const cleaned = data.results
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) => !isBotProtectionItem(item) && !isEmptyProductItem(item)
          ),
        }))
        .filter((group) => group.items.length > 0);

      if (cleaned.length === 0) {
        setSearchResults([]);
        setSearchError("No results found.");
        return;
      }

      setSearchResults(cleaned);
      setSearchSuccess("Fetch completed.");
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSearching(false);
    }
  };


  const handleDelete = async (item) => {
    setSubmitError("");
    const snapshot = products;
    const searchSnapshot = searchResults;
    setProducts((prev) => prev.filter((entry) => !isSameEntry(entry, item)));
    setSearchResults((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.filter((entry) => !isSameEntry(entry, item)),
      }))
    );
    try {
      const { response } = await readJson(`${API_BASE}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_url: item.source_url,
          platform: item.platform,
          country: item.country,
          scraped_at: item.scraped_at,
        }),
      });
      if (!response.ok) {
        throw new Error("Delete failed");
      }
    } catch (error) {
      setSubmitError("Unable to delete from server.");
      setProducts(snapshot);
      setSearchResults(searchSnapshot);
    }
  };

  return (
    <div className="page">
      <HeroStats stats={stats} />
      <Filters
        platform={platform}
        availability={availability}
        platformOptions={PLATFORM_OPTIONS}
        availabilityOptions={AVAILABILITY_OPTIONS}
        onPlatformChange={(event) => setPlatform(event.target.value)}
        onAvailabilityChange={(event) => setAvailability(event.target.value)}
      />
      <FetchForm
        formPlatform={formPlatform}
        formCountry={formCountry}
        searchQuery={searchQuery}
        countryOptions={COUNTRY_OPTIONS}
        isSearching={isSearching}
        searchError={searchError}
        searchSuccess={searchSuccess}
        onPlatformChange={(event) => setFormPlatform(event.target.value)}
        onCountryChange={(event) => setFormCountry(event.target.value)}
        onSearchQueryChange={(event) => setSearchQuery(event.target.value)}
        onSearch={handleSearch}
      />
      {isSearching ? (
        <section className="search-results">
          <h2>Search Results</h2>
          <div className="platform-group">
            <h3>{formPlatform}</h3>
            <div className="grid">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="card skeleton">
                  <div className="card-top">
                    <span className="badge skeleton-pill" />
                    <span className="status skeleton-pill" />
                  </div>
                  <div className="skeleton-line title" />
                  <div className="skeleton-line url" />
                  <div className="price-row">
                    <div className="skeleton-block" />
                    <div className="skeleton-block" />
                    <div className="skeleton-block" />
                  </div>
                  <div className="offers">
                    <span className="pill skeleton-pill" />
                    <span className="pill skeleton-pill" />
                  </div>
                  <div className="meta">
                    <span className="skeleton-line meta-line" />
                    <span className="skeleton-line meta-line" />
                  </div>
                  <div className="skeleton-button" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      {searchResults.length > 0 ? (
        <section className="search-results">
          <h2>Search Results</h2>
          {searchResults.map((group) => (
            <div key={group.platform} className="platform-group">
              <h3>{group.platform}</h3>
              <ProductGrid
                items={group.items}
                onDelete={handleDelete}
                exchangeRates={exchangeRates}
              />
            </div>
          ))}
        </section>
      ) : null}
      <ProductGrid
        items={filtered}
        onDelete={handleDelete}
        exchangeRates={exchangeRates}
      />
    </div>
  );
}
