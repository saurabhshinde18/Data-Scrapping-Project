import { useEffect, useMemo, useState } from "react";
import Filters from "./components/Filters";
import FetchForm from "./components/FetchForm";
import HeroStats from "./components/HeroStats";
import ProductGrid from "./components/ProductGrid";
import { normalizeAvailability } from "./utils";

const API_BASE = "http://127.0.0.1:8000/product";
const PLATFORM_OPTIONS = ["All", "Amazon", "flipkart", "Reliance"];
const AVAILABILITY_OPTIONS = ["All", "In stock", "Blocked", "Other"];

const readJson = async (url, options) => {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { response, data };
};


export default function App() {
  const [products, setProducts] = useState([]);
  const [platform, setPlatform] = useState("All");
  const [availability, setAvailability] = useState("All");
  const [query, setQuery] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formPlatform, setFormPlatform] = useState("Amazon");
  const [formCountry, setFormCountry] = useState("IN");
  const [countryOptions, setCountryOptions] = useState(["IN"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const filtered = useMemo(() => {
    return products.filter((item) => {
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
      const matchesQuery =
        query.trim().length === 0 ||
        item.product.title.toLowerCase().includes(query.toLowerCase());

      return matchesPlatform && matchesAvailability && matchesQuery;
    });
  }, [platform, availability, query, products]);

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
    const loadCountries = async () => {
      try {
        const { response, data } = await readJson(`${API_BASE}/countries`);
        if (!response.ok) return;
        if (Array.isArray(data) && data.length > 0) {
          setCountryOptions(data);
          if (!data.includes(formCountry)) {
            setFormCountry(data[0]);
          }
        }
      } catch (error) {
        // Keep default options if API is unavailable.
      }
    };
    loadCountries();
  }, [formCountry]);

  const stats = useMemo(() => {
    const total = products.length;
    const blocked = products.filter((item) =>
      String(item.product.availability || "")
        .toLowerCase()
        .includes("blocked")
    ).length;
    const inStock = products.filter((item) =>
      String(item.product.availability || "")
        .toLowerCase()
        .includes("in stock")
    ).length;

    return { total, blocked, inStock };
  }, [products]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!formUrl.trim()) {
      setSubmitError("Please enter a product link.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { response, data } = await readJson(`${API_BASE}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: formUrl.trim(),
          platform: formPlatform,
          country: formCountry,
        }),
      });

      if (!response.ok) {
        const message =
          data?.detail ||
          data?.message ||
          `Request failed (${response.status})`;
        throw new Error(message);
      }

      if (!data || !data.product) {
        throw new Error("API returned an unexpected response.");
      }

      setProducts((prev) => [data, ...prev]);
      setSubmitSuccess("Product scraped and added.");
      setFormUrl("");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
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
      setProducts((prev) =>
        prev.filter((entry) => entry.source_url !== item.source_url)
      );
    } catch (error) {
      setSubmitError("Unable to delete from server.");
    }
  };

  return (
    <div className="page">
      <HeroStats stats={stats} />
      <Filters
        platform={platform}
        availability={availability}
        query={query}
        platformOptions={PLATFORM_OPTIONS}
        availabilityOptions={AVAILABILITY_OPTIONS}
        onPlatformChange={(event) => setPlatform(event.target.value)}
        onAvailabilityChange={(event) => setAvailability(event.target.value)}
        onQueryChange={(event) => setQuery(event.target.value)}
      />
      <FetchForm
        formUrl={formUrl}
        formPlatform={formPlatform}
        formCountry={formCountry}
        countryOptions={countryOptions}
        isSubmitting={isSubmitting}
        submitError={submitError}
        submitSuccess={submitSuccess}
        onUrlChange={(event) => setFormUrl(event.target.value)}
        onPlatformChange={(event) => setFormPlatform(event.target.value)}
        onCountryChange={(event) => setFormCountry(event.target.value)}
        onSubmit={handleSubmit}
      />
      <ProductGrid items={filtered} onDelete={handleDelete} />
    </div>
  );
}
