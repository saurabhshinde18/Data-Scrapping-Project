import {
  BarChart3,
  Clock,
  CreditCard,
  FileSearch,
  LogOut,
  Plus,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Input } from "./components/ui/input";
import ProductGrid from "./components/ProductGrid";
import { COUNTRY_OPTIONS, formatDate } from "./utils";

const plans = [
  {
    name: "Starter",
    price: "$19",
    description: "For small teams validating markets.",
    features: ["100 searches / month", "Basic alerts", "Email support"],
  },
  {
    name: "Growth",
    price: "$79",
    description: "Scale monitoring and reporting.",
    features: ["1,000 searches / month", "Advanced alerts", "Team roles"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Custom volumes and SLAs.",
    features: ["Unlimited searches", "Dedicated support", "Custom integrations"],
  },
];

const API_BASE = "http://127.0.0.1:8000/product";
const AUTH_BASE = "http://127.0.0.1:8000/auth";

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

export default function App() {
  const [authView, setAuthView] = useState("signin");
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneCode, setPhoneCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [landingView, setLandingView] = useState("dashboard");
  const [landingPage, setLandingPage] = useState("home");
  const [activeView, setActiveView] = useState("pricing");
  const [userView, setUserView] = useState("scrape");
  const [platform, setPlatform] = useState("Amazon");
  const [country, setCountry] = useState("India");
  const [query, setQuery] = useState("");
  const [scrapeName, setScrapeName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState("");
  const [results, setResults] = useState([]);
  const [dashboardTotals, setDashboardTotals] = useState({
    total: 0,
    inStock: 0,
    outOfStock: 0,
  });
  const [recentScrapes, setRecentScrapes] = useState([]);

  const cleanedResults = useMemo(
    () =>
      results.filter(
        (item) => !isBotProtectionItem(item) && !isEmptyProductItem(item)
      ),
    [results]
  );

  const stats = useMemo(() => {
    const total = cleanedResults.length;
    const inStock = cleanedResults.filter((item) =>
      String(item.product?.availability || "")
        .toLowerCase()
        .includes("in stock")
    ).length;
    return { total, inStock };
  }, [cleanedResults]);

  useEffect(() => {
    const token = localStorage.getItem("session_token");
    if (!token) {
      setAuthLoading(false);
      return;
    }
    readJson(`${AUTH_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(({ response, data }) => {
        if (response.ok && data?.role) {
          setUser({ email: data.email, role: data.role });
        } else {
          localStorage.removeItem("session_token");
        }
      })
      .catch(() => {
        localStorage.removeItem("session_token");
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    readJson(`${API_BASE}/list`)
      .then(({ response, data }) => {
        if (!response.ok || !Array.isArray(data)) return;
        const total = data.length;
        const inStock = data.filter((item) =>
          String(item?.product?.availability || "")
            .toLowerCase()
            .includes("in stock")
        ).length;
        const outOfStock = data.filter((item) =>
          String(item?.product?.availability || "")
            .toLowerCase()
            .includes("out of stock")
        ).length;
        setDashboardTotals({ total, inStock, outOfStock });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(localStorage.getItem("scrape_history") || "[]");
      if (Array.isArray(stored)) {
        setRecentScrapes(stored.slice(0, 8));
      }
    } catch {
      setRecentScrapes([]);
    }
  }, []);

  const persistHistory = (batch) => {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(localStorage.getItem("scrape_history") || "[]");
      const next = [batch, ...stored].slice(0, 20);
      localStorage.setItem("scrape_history", JSON.stringify(next));
      setRecentScrapes(next.slice(0, 8));
    } catch {
      localStorage.setItem("scrape_history", JSON.stringify([batch]));
      setRecentScrapes([batch]);
    }
  };

  const scrollToSection = (sectionId) => {
    if (typeof window === "undefined") return;
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleLandingNav = (pageId) => {
    setLandingView(pageId);
    setLandingPage(pageId);
    if (typeof window !== "undefined") {
      window.setTimeout(() => scrollToSection(pageId), 0);
    }
  };

  const handleAuth = async () => {
    setAuthError("");
    if (!email.trim() || !password.trim()) return;
    const endpoint = authView === "signin" ? "login" : "signup";
    const { response, data } = await readJson(`${AUTH_BASE}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (!response.ok) {
      setAuthError(data?.detail || "Authentication failed.");
      return;
    }
    if (data?.token && data?.user) {
      localStorage.setItem("session_token", data.token);
      setUser(data.user);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("session_token");
    setEmail("");
    setPassword("");
  };

  const handleSearch = async () => {
    setError("");
    if (!query.trim()) {
      setError("Please enter a product name.");
      return;
    }
    setIsSearching(true);
    try {
      const { response, data } = await readJson(`${API_BASE}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          platform,
          country,
          limit: 9,
        }),
      });

      if (!response.ok) {
        throw new Error(data?.detail || "Search failed.");
      }

      const group = Array.isArray(data?.results) ? data.results[0] : null;
      const items = group?.items || [];
      setResults(items);
      if (items.length > 0) {
        persistHistory({
          key: `${query.trim()}|${new Date().toISOString().slice(0, 16)}`,
          query: query.trim(),
          scrapedAt: new Date().toISOString(),
          items,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLandingScrape = async () => {
    setError("");
    if (!scrapeName.trim()) {
      setError("Enter a product name.");
      return;
    }
    setIsSearching(true);
    try {
      const { response, data } = await readJson(`${API_BASE}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: scrapeName.trim(),
          platform,
          country,
          limit: 9,
        }),
      });
      if (!response.ok) {
        throw new Error(data?.detail || "Search by name failed.");
      }
      const group = Array.isArray(data?.results) ? data.results[0] : null;
      setResults(group?.items || []);
      if (group?.items?.length) {
        persistHistory({
          key: `${scrapeName.trim()}|${new Date().toISOString().slice(0, 16)}`,
          query: scrapeName.trim(),
          scrapedAt: new Date().toISOString(),
          items: group.items,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scrape failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleHistoryView = (group) => {
    setResults(group.items || []);
    setLandingPage("scrape");
    if (typeof window !== "undefined") {
      window.setTimeout(() => scrollToSection("scrape"), 0);
    }
  };

  if (authLoading) {
    return (
      <div className="admin-shell">
        <div className="admin-panel">
          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="text-white">Loading session...</CardTitle>
              <CardDescription className="text-slate-300">
                Checking your access.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    if (landingPage === "signin") {
      return (
        <div className="min-h-screen bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 px-6 py-10 text-slate-900">
          <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
              <button
                type="button"
                className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400"
                onClick={() => setLandingPage("home")}
              >
                Back to Home
              </button>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900">
                Welcome Back
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Sign in to your account
              </p>
              <div className="mt-6 grid gap-4">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Email / Username
                  <Input
                    className="mt-2 bg-white"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email or username"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Password
                  <div className="relative mt-2">
                    <Input
                      className="bg-white pr-10"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      ◉
                    </span>
                  </div>
                </label>
                <button
                  type="button"
                  className="text-left text-sm font-medium text-indigo-600"
                >
                  Forgot password?
                </button>
              </div>
              <Button
                onClick={handleAuth}
                className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
              >
                Sign In
              </Button>
              {authError ? (
                <div className="mt-3 text-center text-xs text-rose-500">
                  {authError}
                </div>
              ) : null}
              <div className="mt-6 text-center text-sm text-slate-500">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-indigo-600"
                  onClick={() => {
                    setAuthView("signup");
                    setLandingPage("signup");
                  }}
                >
                  Create one now
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (landingPage === "signup") {
      return (
        <div className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
          <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-start justify-center">
            <div className="w-full max-w-3xl rounded-2xl bg-white p-8 shadow-2xl">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400"
                  onClick={() => setLandingPage("home")}
                >
                  Back to Home
                </button>
                <button
                  type="button"
                  className="text-sm font-semibold text-indigo-600"
                  onClick={() => {
                    setAuthView("signin");
                    setLandingPage("signin");
                  }}
                >
                  Already have an account? Sign in
                </button>
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900">
                Create Account
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Join us today - it&apos;s quick and easy
              </p>

              <div className="mt-6 space-y-6">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Personal Information
                  </p>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Full Name
                      <Input
                        className="mt-2 bg-white"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="John Doe"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Username
                      <Input
                        className="mt-2 bg-white"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="johndoe"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Contact Information
                  </p>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Email Address
                      <Input
                        className="mt-2 bg-white"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="john@example.com"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Phone Number
                      <div className="mt-2 flex gap-2">
                        <select
                          value={phoneCode}
                          onChange={(event) => setPhoneCode(event.target.value)}
                          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
                        >
                          <option value="+91">+91</option>
                          <option value="+1">+1</option>
                          <option value="+44">+44</option>
                        </select>
                        <Input
                          className="bg-white"
                          value={phoneNumber}
                          onChange={(event) => setPhoneNumber(event.target.value)}
                          placeholder="1234567890"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">Security</p>
                  <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Password
                    <Input
                      className="mt-2 bg-white"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                    />
                  </label>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Referral (Optional)
                  </p>
                  <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Referral Code
                    <Input
                      className="mt-2 bg-white"
                      value={referralCode}
                      onChange={(event) => setReferralCode(event.target.value)}
                      placeholder="Enter referral code"
                    />
                  </label>
                </div>

                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={agreeTerms}
                    onChange={(event) => setAgreeTerms(event.target.checked)}
                  />
                  I agree to the Terms and Conditions and Privacy Policy
                </label>
              </div>

              <Button
                onClick={() => {
                  if (!agreeTerms) {
                    setAuthError("Please agree to the terms to continue.");
                    return;
                  }
                  setAuthView("signup");
                  handleAuth();
                }}
                className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
              >
                Create Account
              </Button>
              {authError ? (
                <div className="mt-3 text-center text-xs text-rose-500">
                  {authError}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-20 w-full border-b border-white/20 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
            <button
              type="button"
              className="flex items-center gap-3 text-left"
              onClick={() => handleLandingNav("home")}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-lg font-semibold">
                HH
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">Data Scrape</p>
                <p className="text-xs text-white/70">Market Intelligence Suite</p>
              </div>
            </button>
            <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
              <button
                type="button"
                className="transition hover:text-white/80"
                onClick={() => handleLandingNav("home")}
              >
                Docs
              </button>
              <button
                type="button"
                className="transition hover:text-white/80"
                onClick={() => handleLandingNav("subscriptions")}
              >
                Plans
              </button>
              <button
                type="button"
                className="transition hover:text-white/80"
                onClick={() => handleLandingNav("support")}
              >
                Support
              </button>
            </nav>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="border-white/40 bg-white/15 text-white hover:bg-white/25"
                onClick={() => {
                  setAuthView("signin");
                  setLandingPage("signin");
                }}
              >
                Sign In
              </Button>
              <Button
                className="bg-white text-indigo-700 hover:bg-slate-100"
                onClick={() => {
                  setAuthView("signup");
                  setLandingPage("signup");
                }}
              >
                Register
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-screen-2xl items-stretch gap-8 px-6 py-10 lg:grid-cols-[260px_1fr]">
          <aside className="h-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-gradient-to-b from-indigo-50 via-white to-white px-5 py-6">
              <p className="text-lg font-semibold text-slate-900">Data Scrape</p>
              <p className="mt-1 text-sm text-slate-500">
                Quick access to features
              </p>
            </div>
            <nav className="grid gap-2 px-4 py-5 text-sm">
              {[
                {
                  label: "Dashboard",
                  id: "dashboard",
                  icon: BarChart3,
                },
                {
                  label: "Scrape",
                  id: "scrape",
                  icon: FileSearch,
                },
                {
                  label: "Subscriptions",
                  id: "subscriptions",
                  icon: CreditCard,
                },
                { label: "History", id: "history", icon: Clock },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-active={landingView === item.id}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left font-semibold transition ${
                    landingView === item.id
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200/60"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                  onClick={() => handleLandingNav(item.id)}
                >
                  <span className="flex items-center gap-3">
                    <item.icon
                      className={`h-5 w-5 ${
                        landingView === item.id
                          ? "text-white"
                          : "text-slate-500"
                      }`}
                    />
                    {item.label}
                  </span>
                  <span
                    className={`text-base ${
                      landingView === item.id ? "text-white/90" : "text-slate-400"
                    }`}
                  >
                    &gt;
                  </span>
                </button>
              ))}
            </nav>
            <div className="px-4 pb-6">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Need help?</p>
                  <p className="text-xs text-indigo-600">Visit Help Center -&gt;</p>
                </div>
              </div>
            </div>
          </aside>

          <main className="space-y-10">
            {landingPage === "home" ? (
              <>
                <section
                  id="home"
                  className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                    Unified Product Data Platform
                  </div>
                  <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                    Scrape Product Data{" "}
                    <span className="text-indigo-600">At Scale</span>
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm text-slate-600 md:text-base">
                    Monitor prices, availability, and product trends across
                    marketplaces with clean, structured data delivered fast.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Button className="bg-indigo-600 hover:bg-indigo-500">
                      Start Scraping
                    </Button>
                    <Button
                      variant="outline"
                      className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      Learn More
                    </Button>
                  </div>
                  <div className="mt-8 grid gap-4 text-sm text-slate-600 md:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Starter plans for new teams
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Verified data sources
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Fresh daily snapshots
                    </div>
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                  {[
                    { label: "Growing", value: "2.4x", note: "Month-over-month" },
                    { label: "Active", value: "5,200", note: "Live feeds" },
                    { label: "High", value: "450+", note: "Partner brands" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-900">
                        {stat.value}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">{stat.note}</p>
                    </div>
                  ))}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Why Data Scrape
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                    Capture pricing, stock, and product signals in minutes.
                  </h2>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600">
                    <div className="flex items-center gap-3">
                      <FileSearch className="h-4 w-4 text-indigo-500" />
                      Track products across marketplaces with smart filters.
                    </div>
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-4 w-4 text-indigo-500" />
                      Clean, verified outputs ready for analytics.
                    </div>
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-4 w-4 text-indigo-500" />
                      Monitor trends and alerts from a single workspace.
                    </div>
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  {[
                    {
                      title: "Marketplace Coverage",
                      text: "Amazon, Flipkart, Reliance, and regional catalogs.",
                    },
                    {
                      title: "Clean Data Pipeline",
                      text: "Normalized fields and deduped listings.",
                    },
                    {
                      title: "Fast Export",
                      text: "CSV, JSON, and scheduled webhooks.",
                    },
                    {
                      title: "Compliance Ready",
                      text: "Throttling, retries, and error tracking.",
                    },
                  ].map((feature) => (
                    <div
                      key={feature.title}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {feature.title}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">{feature.text}</p>
                    </div>
                  ))}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    What Teams Say
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {[
                      "Pricing alerts cut our response time by 70%.",
                      "Weekly trend reports keep the team aligned.",
                      "Exports drop directly into our BI stack.",
                    ].map((quote) => (
                      <div
                        key={quote}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
                      >
                        {quote}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Quick FAQ
                  </p>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      How often is data refreshed?
                      <div className="mt-2 text-xs text-slate-500">
                        Snapshots run daily with optional hourly refresh.
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      Can I schedule exports?
                      <div className="mt-2 text-xs text-slate-500">
                        Yes, schedule CSV or webhook deliveries.
                      </div>
                    </div>
                  </div>
                </section>
              </>
            ) : null}

            {landingPage === "dashboard" ? (
              <section
                id="dashboard"
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Dashboard
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                      Live Scraping Overview
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Track pricing changes, availability, and trend signals in
                      one place.
                    </p>
                  </div>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-500"
                    onClick={() => handleLandingNav("scrape")}
                  >
                    New Scrape Job
                  </Button>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  {[
                    { label: "Total Products Scraped", value: "12,480" },
                    { label: "Available Products", value: "8,932" },
                    { label: "Out of Stock", value: "1,964" },
                    { label: "Price Drops (24h)", value: "612" },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="text-xs text-slate-500">{metric.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Platform Split
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      {[
                        "Amazon: 52%",
                        "Flipkart: 31%",
                        "Reliance: 17%",
                      ].map((row) => (
                        <div
                          key={row}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <span>{row}</span>
                          <span className="text-xs text-slate-500">Share</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Freshness
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      {[
                        "Updated in last 1h: 1,420",
                        "Updated in 24h: 7,880",
                        "Stale (3+ days): 610",
                      ].map((row) => (
                        <div
                          key={row}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          {row}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Recent Jobs
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      {[
                        "Amazon - Phones price scan",
                        "Flipkart - Laptops availability",
                        "Reliance - Weekly category crawl",
                      ].map((job) => (
                        <div
                          key={job}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <span>{job}</span>
                          <span className="text-xs text-slate-500">Running</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Alerts
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      {[
                        "iPhone 15 price drop detected",
                        "Out-of-stock spike on earbuds",
                        "New seller appeared in laptops",
                      ].map((alert) => (
                        <div
                          key={alert}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          {alert}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {landingPage === "scrape" ? (
              <section
                id="scrape"
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Scrape
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                      Scrape Products by Name
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Enter a product name and the platform will use the
                      configured base URLs to collect matching products.
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Platform
                    <select
                      value={platform}
                      onChange={(event) => setPlatform(event.target.value)}
                      className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
                    >
                      <option value="Amazon">Amazon</option>
                      <option value="flipkart">flipkart</option>
                      <option value="Reliance">Reliance</option>
                    </select>
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Country
                    <select
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
                    >
                      {COUNTRY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Product Name
                    <Input
                      className="mt-2 bg-white"
                      value={scrapeName}
                      onChange={(event) => setScrapeName(event.target.value)}
                      placeholder="iPhone, earbuds, laptops..."
                    />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleLandingScrape}
                    className="bg-indigo-600 hover:bg-indigo-500"
                    disabled={isSearching}
                  >
                    {isSearching ? "Scraping..." : "Scrape Products"}
                  </Button>
                  {error ? (
                    <span className="text-sm text-rose-500">{error}</span>
                  ) : null}
                </div>
                {cleanedResults.length > 0 ? (
                  <div className="mt-6">
                    <ProductGrid
                      items={cleanedResults}
                      onDelete={() => {}}
                      exchangeRates={null}
                      isLoading={isSearching}
                    />
                  </div>
                ) : isSearching ? (
                  <div className="mt-6">
                    <ProductGrid
                      items={[]}
                      onDelete={() => {}}
                      exchangeRates={null}
                      isLoading
                    />
                  </div>
                ) : null}
              </section>
            ) : null}

            {landingPage === "subscriptions" ? (
              <section
                id="subscriptions"
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Subscriptions
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                      Plans Built for Data Teams
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Scale from exploratory scraping to enterprise pipelines.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    Compare Plans
                  </Button>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.name}
                      className={`rounded-xl border p-4 ${
                        plan.highlight
                          ? "border-indigo-200 bg-indigo-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {plan.name}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {plan.price}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {plan.description}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Included in every plan
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      {[
                        "Scheduled exports",
                        "Data normalization",
                        "Basic alerting",
                        "Team workspace",
                      ].map((item) => (
                        <div
                          key={item}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Upgrade benefits
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      {[
                        "Higher request limits",
                        "Priority refresh jobs",
                        "Dedicated success manager",
                        "Custom integrations",
                      ].map((item) => (
                        <div
                          key={item}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {landingPage === "history" ? (
              <section
                id="history"
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      History
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                      Recent Scrape Activity
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Review completed jobs and export reports when needed.
                    </p>
                  </div>
                  <Button className="bg-indigo-600 hover:bg-indigo-500">
                    Export Logs
                  </Button>
                </div>
                <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div className="grid gap-3 text-sm text-slate-600">
                    {recentScrapes.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        No recent scrapes yet.
                      </div>
                    ) : (
                      recentScrapes.map((group) => (
                        <div
                          key={group.key}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                {group.query === "unknown"
                                  ? "Search Batch"
                                  : `Product: ${group.query}`}
                              </p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {group.items.length} products scraped
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Scraped: {formatDate(group.scrapedAt)}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              onClick={() => handleHistoryView(group)}
                            >
                              View Result
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Filters
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      {[
                        "Platform: All",
                        "Status: Completed",
                        "Range: Last 7 days",
                      ].map((filter) => (
                        <div
                          key={filter}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          {filter}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {landingPage === "support" ? (
              <section
                id="support"
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Support
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                      How can we help?
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Find quick answers or contact the team.
                    </p>
                  </div>
                  <Button className="bg-indigo-600 hover:bg-indigo-500">
                    Open Ticket
                  </Button>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    {
                      title: "Getting Started",
                      text: "Setup guides, API access, and first scrape.",
                    },
                    {
                      title: "Billing & Plans",
                      text: "Invoices, upgrades, and payment questions.",
                    },
                    {
                      title: "Data Quality",
                      text: "Normalization, dedupe rules, and freshness.",
                    },
                    {
                      title: "Integrations",
                      text: "Webhooks, exports, and BI connections.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">{item.text}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  Response time: under 24 hours on business days.
                </div>
              </section>
            ) : null}
          </main>
        </div>
      </div>
    );
  }

  if (user.role === "user") {
    return (
      <div className="admin-shell">
        <div className="admin-panel">
          <header className="admin-header">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="badge">User Panel</span>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  Product Scraping Workspace
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Scrape products, manage subscriptions, and review results.
                </p>
              </div>
              <Button
                variant="outline"
                className="border-white/20 text-white"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </header>

          <section className="admin-layout">
            <aside className="admin-sidebar">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Navigation
              </p>
              <nav className="admin-nav">
                <button
                  type="button"
                  data-active={userView === "scrape"}
                  onClick={() => setUserView("scrape")}
                >
                  <FileSearch className="h-4 w-4" />
                  Scrape
                </button>
                <button
                  type="button"
                  data-active={userView === "subscriptions"}
                  onClick={() => setUserView("subscriptions")}
                >
                  <CreditCard className="h-4 w-4" />
                  Subscriptions
                </button>
              </nav>
            </aside>

            <div className="space-y-6">
              {userView === "scrape" ? (
                <Card className="admin-card">
                  <CardHeader>
                    <CardTitle className="text-white">Scrape Products</CardTitle>
                    <CardDescription className="text-slate-300">
                      Search by product name and fetch the latest results.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Platform
                        <select
                          value={platform}
                          onChange={(event) => setPlatform(event.target.value)}
                          className="mt-2 w-full rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                        >
                          <option value="Amazon">Amazon</option>
                          <option value="flipkart">flipkart</option>
                          <option value="Reliance">Reliance</option>
                        </select>
                      </label>
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Country
                        <select
                          value={country}
                          onChange={(event) => setCountry(event.target.value)}
                          className="mt-2 w-full rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                        >
                          {COUNTRY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Product Name
                        <Input
                          className="mt-2"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Try iPhone, earbuds, laptops..."
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        onClick={handleSearch}
                        className="bg-indigo-500 hover:bg-indigo-400"
                        disabled={isSearching}
                      >
                        {isSearching ? "Fetching..." : "Fetch Products"}
                      </Button>
                      {error ? (
                        <span className="text-sm text-rose-300">{error}</span>
                      ) : null}
                    </div>
                    {cleanedResults.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {cleanedResults.map((item) => (
                          <Card key={item.source_url} className="admin-card">
                            <CardContent className="space-y-3">
                              <div>
                                <p className="text-sm text-slate-400">
                                  {item.platform}
                                </p>
                                <h3 className="text-lg font-semibold text-white">
                                  {item.product?.title || "Untitled"}
                                </h3>
                              </div>
                              <div className="text-sm text-slate-300">
                                Availability: {item.product?.availability || "?"}
                              </div>
                              <div className="text-sm text-slate-300">
                                Price: {item.product?.price || "?"}
                              </div>
                              <div className="text-xs text-slate-500 break-all">
                                {item.source_url}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              {userView === "subscriptions" ? (
                <div className="grid gap-4 lg:grid-cols-3">
                  {plans.map((plan) => (
                    <Card key={plan.name} className="admin-card">
                      <CardHeader>
                        <CardTitle className="text-white">{plan.name}</CardTitle>
                        <CardDescription className="text-slate-300">
                          {plan.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-3xl font-semibold text-white">
                          {plan.price}
                        </div>
                        <ul className="space-y-2 text-sm text-slate-200">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-emerald-300" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <Button className="w-full bg-indigo-500 hover:bg-indigo-400">
                          Choose Plan
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <div className="admin-panel">
        <header className="admin-header">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="badge">Admin Panel</span>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Pricing Management Console
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Manage subscription pricing and plan access for users.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="border-white/20 text-white">
                Export
              </Button>
              <Button className="bg-indigo-500 hover:bg-indigo-400">
                <Plus className="mr-2 h-4 w-4" />
                New Invite
              </Button>
              <Button
                variant="outline"
                className="border-white/20 text-white"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="admin-card">
              <CardHeader>
                <CardTitle className="text-white">Active Users</CardTitle>
                <CardDescription className="text-slate-300">
                  Verified accounts in the system.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-white">128</CardContent>
            </Card>
            <Card className="admin-card">
              <CardHeader>
                <CardTitle className="text-white">Monthly Searches</CardTitle>
                <CardDescription className="text-slate-300">
                  Across all platforms this month.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-white">42,610</CardContent>
            </Card>
            <Card className="admin-card">
              <CardHeader>
                <CardTitle className="text-white">Revenue</CardTitle>
                <CardDescription className="text-slate-300">
                  Current billing cycle.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-white">$18,420</CardContent>
            </Card>
          </div>
        </header>

        <section className="admin-layout">
          <aside className="admin-sidebar">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Navigation
            </p>
            <nav className="admin-nav">
              <button
                type="button"
                data-active={activeView === "pricing"}
                onClick={() => setActiveView("pricing")}
              >
                <CreditCard className="h-4 w-4" />
                Pricing
              </button>
              <button
                type="button"
                data-active={activeView === "subscriptions"}
                onClick={() => setActiveView("subscriptions")}
              >
                <UserCircle2 className="h-4 w-4" />
                Users
              </button>
              <button
                type="button"
                data-active={activeView === "dashboard"}
                onClick={() => setActiveView("dashboard")}
              >
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </button>
            </nav>
          </aside>

          <div className="space-y-6">
            {activeView === "pricing" ? (
              <Card className="admin-card">
                <CardHeader>
                  <CardTitle className="text-white">Plan Pricing</CardTitle>
                  <CardDescription className="text-slate-300">
                    Update pricing and feature access for each plan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    {plans.map((plan) => (
                      <Card key={plan.name} className="admin-card">
                        <CardHeader>
                          <CardTitle className="text-white">{plan.name}</CardTitle>
                          <CardDescription className="text-slate-300">
                            {plan.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-slate-200">
                          <div className="text-2xl font-semibold text-white">
                            {plan.price}
                          </div>
                          <ul className="space-y-2">
                            {plan.features.map((feature) => (
                              <li key={feature} className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                          <Button className="w-full bg-indigo-500 hover:bg-indigo-400">
                            Edit Pricing
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {activeView === "subscriptions" ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { label: "Total Users", value: "1,240" },
                  { label: "Active Subscribers", value: "860" },
                  { label: "Trial Users", value: "140" },
                  { label: "Churned (30d)", value: "24" },
                ].map((metric) => (
                  <Card key={metric.label} className="admin-card">
                    <CardHeader>
                      <CardTitle className="text-white">{metric.label}</CardTitle>
                      <CardDescription className="text-slate-300">
                        Subscription user overview.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-3xl font-semibold text-white">
                      {metric.value}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}

            {activeView === "dashboard" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="admin-card">
                  <CardHeader>
                    <CardTitle className="text-white">Products Scraped</CardTitle>
                    <CardDescription className="text-slate-300">
                      Total scraped from storage.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-3xl font-semibold text-white">
                    {dashboardTotals.total}
                  </CardContent>
                </Card>
                <Card className="admin-card">
                  <CardHeader>
                    <CardTitle className="text-white">In Stock</CardTitle>
                    <CardDescription className="text-slate-300">
                      Available products from storage.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-3xl font-semibold text-white">
                    {dashboardTotals.inStock}
                  </CardContent>
                </Card>
                <Card className="admin-card">
                  <CardHeader>
                    <CardTitle className="text-white">Out of Stock</CardTitle>
                    <CardDescription className="text-slate-300">
                      Products marked out of stock.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-3xl font-semibold text-white">
                    {dashboardTotals.outOfStock}
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
