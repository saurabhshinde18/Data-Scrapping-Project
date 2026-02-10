import {
  BarChart3,
  Clock,
  CreditCard,
  FileSearch,
  Plus,
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
import AuthSignIn from "./components/AuthSignIn";
import AuthSignUp from "./components/AuthSignUp";
import PlanCard from "./components/PlanCard";
import { COUNTRY_OPTIONS, formatDate } from "./utils";
import { planCatalog } from "./constants/plans";
import { readJson } from "./services/api";
import AdminPanel from "./features/admin/AdminPanel";

const API_BASE = "http://127.0.0.1:8000/product";
const AUTH_BASE = "http://127.0.0.1:8000/auth";
const ANALYTICS_BASE = "http://127.0.0.1:8000/analytics";


const normalizePlan = (plan) => {
  const next = { ...plan };
  if (typeof next.features === "string") {
    try {
      const parsed = JSON.parse(next.features);
      next.features = Array.isArray(parsed) ? parsed : [];
    } catch {
      next.features = [];
    }
  }
  if (!Array.isArray(next.features)) {
    next.features = [];
  }
  if (next.description == null) {
    next.description = "";
  }
  return next;
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
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(null);
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const [landingView, setLandingView] = useState("dashboard");
  const [landingPage, setLandingPage] = useState("home");
  const [activeView, setActiveView] = useState("dashboard");
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
  const [subscriptionStatus, setSubscriptionStatus] = useState({ active: false });
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [planPricing, setPlanPricing] = useState([]);
  const [planPricingError, setPlanPricingError] = useState("");
  const [planPricingLoading, setPlanPricingLoading] = useState(false);
  const [selectedPlanName, setSelectedPlanName] = useState("");
  const [adminMetricsState, setAdminMetricsState] = useState({
    total_users: 0,
    active_subscribers: 0,
    revenue: 0,
  });
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminPlans, setAdminPlans] = useState([]);
  const [planEditOpen, setPlanEditOpen] = useState(false);
  const [planEdit, setPlanEdit] = useState(null);
  const [planEditAmount, setPlanEditAmount] = useState("");
  const [planEditCurrency, setPlanEditCurrency] = useState("INR");
  const [planEditDuration, setPlanEditDuration] = useState("");
  const [planEditDescription, setPlanEditDescription] = useState("");
  const [planEditFeaturesText, setPlanEditFeaturesText] = useState("");
  const [planEditLoading, setPlanEditLoading] = useState(false);
  const [planEditError, setPlanEditError] = useState("");
  const [adminInvites, setAdminInvites] = useState([]);
  const [adminVisitors, setAdminVisitors] = useState([]);
  const [adminVisitorRange, setAdminVisitorRange] = useState(90);
  const [adminVisitorsError, setAdminVisitorsError] = useState("");
  const [adminRegistrations, setAdminRegistrations] = useState([]);
  const [adminRegistrationsError, setAdminRegistrationsError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [invitePhoneCode, setInvitePhoneCode] = useState("+91");
  const [invitePhoneNumber, setInvitePhoneNumber] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [inviteCopyStatus, setInviteCopyStatus] = useState("");
  const [inviteDeleteLoadingId, setInviteDeleteLoadingId] = useState(null);
  const [inviteDeleteError, setInviteDeleteError] = useState("");
  const [adminUsersError, setAdminUsersError] = useState("");
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);

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

  const pricingByName = useMemo(() => {
    const map = new Map();
    planPricing.forEach((plan) => {
      map.set(plan.name, plan);
    });
    return map;
  }, [planPricing]);

  const mergedPlans = useMemo(
    () =>
      planCatalog.map((plan) => {
        const pricing = pricingByName.get(plan.name);
        if (!pricing) return plan;
        const displayPrice =
          pricing.amount === 0
            ? "Custom"
            : `${pricing.currency} ${Math.round(pricing.amount).toLocaleString()}`;
        return {
          ...plan,
          price: displayPrice,
          amount: pricing.amount,
          currency: pricing.currency,
          duration_days: pricing.duration_days,
          description: pricing.description || plan.description,
          features: pricing.features?.length ? pricing.features : plan.features,
        };
      }),
    [pricingByName]
  );

  const adminPricingByName = useMemo(() => {
    const map = new Map();
    adminPlans.forEach((plan) => {
      map.set(plan.name, plan);
    });
    return map;
  }, [adminPlans]);

  const adminMergedPlans = useMemo(
    () =>
      planCatalog.map((plan) => {
        const pricing = adminPricingByName.get(plan.name) || pricingByName.get(plan.name);
        if (!pricing) return plan;
        const displayPrice =
          pricing.amount === 0
            ? "Custom"
            : `${pricing.currency} ${Math.round(pricing.amount).toLocaleString()}`;
        return {
          ...plan,
          price: displayPrice,
          amount: pricing.amount,
          currency: pricing.currency,
          duration_days: pricing.duration_days,
          description: pricing.description || plan.description,
          features: pricing.features?.length ? pricing.features : plan.features,
        };
      }),
    [adminPricingByName, pricingByName]
  );

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const lastTracked = localStorage.getItem("visitor_last_tracked");
    if (lastTracked === today) return;
    let visitorId = localStorage.getItem("visitor_id");
    if (!visitorId) {
      visitorId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      localStorage.setItem("visitor_id", visitorId);
    }
    readJson(`${ANALYTICS_BASE}/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname, visitor_id: visitorId }),
    }).finally(() => {
      localStorage.setItem("visitor_last_tracked", today);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setResetToken(token);
      setLandingPage("reset");
      setLandingView("reset");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role === "admin") {
      fetchAdminData();
      return;
    }
    if (landingPage === "home" || landingPage === "signin" || landingPage === "signup") {
      setLandingView("dashboard");
      setLandingPage("dashboard");
    }
    fetchSubscriptionStatus();
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetchAdminVisitors(adminVisitorRange);
  }, [user, adminVisitorRange]);

  useEffect(() => {
    fetchPlanPricing();
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

  const fetchSubscriptionStatus = async () => {
    const token = localStorage.getItem("session_token");
    if (!token) {
      setSubscriptionStatus({ active: false });
      return;
    }
    const { response, data } = await readJson(`${API_BASE.replace("/product", "")}/subscriptions/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok && data) {
      setSubscriptionStatus(data);
    } else {
      setSubscriptionStatus({ active: false });
    }
  };

  const fetchPlanPricing = async () => {
    setPlanPricingError("");
    setPlanPricingLoading(true);
    try {
      const { response, data } = await readJson(
        `${API_BASE.replace("/product", "")}/subscriptions/plans`
      );
      if (!response.ok || !Array.isArray(data)) {
        throw new Error("Failed to load plan pricing.");
      }
      setPlanPricing(data.map(normalizePlan));
    } catch (err) {
      setPlanPricingError(err instanceof Error ? err.message : "Failed to load plan pricing.");
    } finally {
      setPlanPricingLoading(false);
    }
  };

  const fetchAdminData = async () => {
    const token = localStorage.getItem("session_token");
    if (!token) {
      setAdminUsersError("Missing session token.");
      return;
    }
    setAdminUsersLoading(true);
    setAdminUsersError("");
    const results = await Promise.allSettled([
      readJson(`${API_BASE.replace("/product", "")}/admin/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      readJson(`${API_BASE.replace("/product", "")}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      readJson(`${API_BASE.replace("/product", "")}/admin/invites`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      readJson(`${API_BASE.replace("/product", "")}/admin/plans`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const [metricsRes, usersRes, invitesRes, plansRes] = results.map((result) =>
      result.status === "fulfilled" ? result.value : null
    );

    if (metricsRes?.response?.ok && metricsRes.data) {
      setAdminMetricsState(metricsRes.data);
    }
    if (usersRes?.response?.ok && Array.isArray(usersRes.data)) {
      setAdminUsers(usersRes.data);
    } else if (usersRes?.response) {
      const detail =
        (usersRes.data && usersRes.data.detail) ||
        usersRes.text ||
        usersRes.response.statusText ||
        "Failed to load users.";
      setAdminUsersError(detail);
    }
    if (invitesRes?.response?.ok && Array.isArray(invitesRes.data)) {
      setAdminInvites(invitesRes.data);
    }
    if (plansRes?.response?.ok && Array.isArray(plansRes.data)) {
      setAdminPlans(plansRes.data.map(normalizePlan));
    }
    setAdminUsersLoading(false);
  };

  const fetchAdminVisitors = async (rangeDays) => {
    const token = localStorage.getItem("session_token");
    if (!token) {
      setAdminVisitorsError("Missing session token.");
      return;
    }
    setAdminVisitorsError("");
    setAdminRegistrationsError("");
    const { response, data, text } = await readJson(
      `${API_BASE.replace("/product", "")}/admin/visitors?range_days=${rangeDays}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok || !Array.isArray(data)) {
      setAdminVisitorsError(
        (data && data.detail) || text || response.statusText || "Failed to load visitors."
      );
    } else {
      setAdminVisitors(data);
    }

    const registrationsRes = await readJson(
      `${API_BASE.replace("/product", "")}/admin/registrations?range_days=${rangeDays}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!registrationsRes.response.ok || !Array.isArray(registrationsRes.data)) {
      setAdminRegistrationsError(
        (registrationsRes.data && registrationsRes.data.detail) ||
          registrationsRes.text ||
          registrationsRes.response.statusText ||
          "Failed to load registrations."
      );
      return;
    }
    setAdminRegistrations(registrationsRes.data);
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
    const payload =
      authView === "signup"
        ? {
            email: email.trim(),
            password,
            full_name: fullName.trim() || null,
            username: username.trim() || null,
            phone_code: phoneCode.trim() || null,
            phone_number: phoneNumber.trim() || null,
          }
        : { email: email.trim(), password };
    const { response, data } = await readJson(`${AUTH_BASE}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setAuthError(data?.detail || "Authentication failed.");
      return;
    }
    if (data?.token && data?.user) {
      localStorage.setItem("session_token", data.token);
      setUser(data.user);
      setLandingView("dashboard");
      setLandingPage("dashboard");
    }
  };

  const handleForgotOpen = () => {
    setForgotEmail(email || "");
    setForgotError("");
    setForgotSuccess(null);
    setForgotOpen(true);
  };

  const handleForgotClose = () => {
    setForgotOpen(false);
    setForgotError("");
    setForgotSuccess(null);
  };

  const handleForgotSubmit = async () => {
    setForgotError("");
    setForgotSuccess(null);
    if (!forgotEmail.trim()) {
      setForgotError("Email is required.");
      return;
    }
    setForgotLoading(true);
    try {
      const { response, data } = await readJson(`${AUTH_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      if (!response.ok) {
        throw new Error(data?.detail || "Reset failed.");
      }
      setForgotSuccess({ email: forgotEmail.trim() });
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async () => {
    setResetError("");
    setResetSuccess(false);
    if (!resetToken) {
      setResetError("Missing reset token.");
      return;
    }
    if (!resetPassword.trim()) {
      setResetError("Enter a new password.");
      return;
    }
    if (resetPassword !== resetConfirm) {
      setResetError("Passwords do not match.");
      return;
    }
    setResetLoading(true);
    try {
      const { response, data } = await readJson(`${AUTH_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          new_password: resetPassword,
        }),
      });
      if (!response.ok) {
        throw new Error(data?.detail || "Reset failed.");
      }
      setResetSuccess(true);
      setResetPassword("");
      setResetConfirm("");
      window.setTimeout(() => {
        setLandingPage("signin");
      }, 1500);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("session_token");
    setEmail("");
    setPassword("");
    setSubscriptionStatus({ active: false });
    setAdminUsers([]);
    setAdminInvites([]);
    setAdminPlans([]);
    setAdminMetricsState({
      total_users: 0,
      active_subscribers: 0,
      revenue: 0,
    });
  };

  const resetInviteForm = () => {
    setInviteEmail("");
    setInviteName("");
    setInviteUsername("");
    setInvitePhoneCode("+91");
    setInvitePhoneNumber("");
    setInviteError("");
    setInviteSuccess(null);
    setInviteCopyStatus("");
  };

  const handleInviteOpen = () => {
    resetInviteForm();
    setInviteOpen(true);
  };

  const handleInviteClose = () => {
    setInviteOpen(false);
    resetInviteForm();
  };

  const handleInviteCopy = async () => {
    if (!inviteSuccess?.email || !inviteSuccess?.temp_password) return;
    try {
      await navigator.clipboard.writeText(
        `Email: ${inviteSuccess.email}\nPassword: ${inviteSuccess.temp_password}`
      );
      setInviteCopyStatus("Copied to clipboard.");
    } catch {
      setInviteCopyStatus("Copy failed. Please copy manually.");
    }
  };

  const handleCreateInvite = async () => {
    setInviteError("");
    setInviteSuccess(null);
    setInviteCopyStatus("");
    if (!inviteEmail.trim()) {
      setInviteError("Email is required.");
      return;
    }
    setInviteLoading(true);
    try {
      const token = localStorage.getItem("session_token");
      if (!token) {
        throw new Error("Missing session. Please sign in again.");
      }
      const { response, data } = await readJson(
        `${API_BASE.replace("/product", "")}/admin/invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: inviteEmail.trim(),
            full_name: inviteName.trim() || null,
            username: inviteUsername.trim() || null,
            phone_code: invitePhoneCode.trim() || null,
            phone_number: invitePhoneNumber.trim() || null,
          }),
        }
      );
      if (!response.ok) {
        throw new Error(data?.detail || "Invite failed.");
      }
      setInviteSuccess({
        email: data.email,
        temp_password: data.temp_password,
      });
      setInviteEmail("");
      setInviteName("");
      setInviteUsername("");
      setInvitePhoneNumber("");
      await fetchAdminData();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Invite failed.");
    } finally {
      setInviteLoading(false);
    }
  };

  const resetPlanEdit = () => {
    setPlanEdit(null);
    setPlanEditAmount("");
    setPlanEditCurrency("INR");
    setPlanEditDuration("");
    setPlanEditDescription("");
    setPlanEditFeaturesText("");
    setPlanEditError("");
  };

  const handlePlanEditOpen = (plan) => {
    if (!plan) return;
    setPlanEdit(plan);
    setPlanEditAmount(
      typeof plan.amount === "number" ? String(plan.amount) : ""
    );
    setPlanEditCurrency(plan.currency || "INR");
    setPlanEditDuration(
      typeof plan.duration_days === "number" ? String(plan.duration_days) : ""
    );
    setPlanEditDescription(plan.description || "");
    setPlanEditFeaturesText(
      Array.isArray(plan.features) ? plan.features.join("\n") : ""
    );
    setPlanEditError("");
    setPlanEditOpen(true);
  };

  const handlePlanEditClose = () => {
    setPlanEditOpen(false);
    resetPlanEdit();
  };

  const handlePlanSave = async () => {
    if (!planEdit?.name) return;
    setPlanEditError("");
    setPlanEditLoading(true);
    try {
      const token = localStorage.getItem("session_token");
      if (!token) {
        throw new Error("Missing session. Please sign in again.");
      }
      const amount = planEditAmount.trim();
      const duration = planEditDuration.trim();
      const features = planEditFeaturesText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const payload = {
        amount: amount ? Number(amount) : null,
        currency: planEditCurrency.trim() || null,
        duration_days: duration ? Number(duration) : null,
        description: planEditDescription.trim() || null,
        features,
      };
      if (Number.isNaN(payload.amount)) {
        throw new Error("Amount must be a number.");
      }
      if (Number.isNaN(payload.duration_days)) {
        throw new Error("Duration must be a number.");
      }
      const { response, data } = await readJson(
        `${API_BASE.replace("/product", "")}/admin/plans/${encodeURIComponent(
          planEdit.name
        )}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        throw new Error(data?.detail || "Update failed.");
      }
      const normalized = normalizePlan(data);
      setAdminPlans((prev) => {
        const exists = prev.some((plan) => plan.name === normalized.name);
        if (!exists) return [...prev, normalized];
        return prev.map((plan) => (plan.name === normalized.name ? normalized : plan));
      });
      setPlanPricing((prev) => {
        const exists = prev.some((plan) => plan.name === normalized.name);
        if (!exists) return [...prev, normalized];
        return prev.map((plan) => (plan.name === normalized.name ? normalized : plan));
      });
      await fetchPlanPricing();
      await fetchAdminData();
      setPlanEditOpen(false);
      resetPlanEdit();
    } catch (err) {
      setPlanEditError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setPlanEditLoading(false);
    }
  };

  const toCsv = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return "";
    const headers = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row || {}).forEach((key) => set.add(key));
        return set;
      }, new Set())
    );
    const escapeCell = (value) => {
      if (value == null) return "";
      if (Array.isArray(value)) return `"${value.join("; ").replace(/"/g, '""')}"`;
      const text = String(value);
      if (text.includes('"') || text.includes(",") || text.includes("\n")) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };
    const lines = [
      headers.join(","),
      ...rows.map((row) => headers.map((h) => escapeCell(row?.[h])).join(",")),
    ];
    return lines.join("\n");
  };

  const downloadCsv = (filename, rows) => {
    const csv = toCsv(rows);
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const escapeHtml = (value) => {
    if (value == null) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const toHtmlTable = (title, rows) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (safeRows.length === 0) {
      return `<h3>${escapeHtml(title)}</h3><p>No data</p>`;
    }
    const headers = Array.from(
      safeRows.reduce((set, row) => {
        Object.keys(row || {}).forEach((key) => set.add(key));
        return set;
      }, new Set())
    );
    const thead = headers
      .map((h) => `<th>${escapeHtml(h)}</th>`)
      .join("");
    const tbody = safeRows
      .map((row) => {
        const cells = headers
          .map((h) => {
            const value = row?.[h];
            if (Array.isArray(value)) {
              return `<td>${escapeHtml(value.join("; "))}</td>`;
            }
            return `<td>${escapeHtml(value)}</td>`;
          })
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
    return `
      <h3>${escapeHtml(title)}</h3>
      <table border="1">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    `;
  };

  const downloadExcel = (filename, sections) => {
    const content = sections.join(
      `<div style="height:16px;"></div>`
    );
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { padding: 6px 8px; }
            th { background: #f1f5f9; text-align: left; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `;
    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const sections = [
      toHtmlTable("Metrics", [adminMetricsState]),
      toHtmlTable("Users", adminUsers),
      toHtmlTable("Invited Admins", adminInvites),
      toHtmlTable("Plans", adminPlans),
    ];
    downloadExcel(`dashboard-export-${stamp}.xls`, sections);
  };

  const handleDeleteInvite = async (adminId) => {
    if (!adminId) return;
    const ok = window.confirm("Delete this invited admin?");
    if (!ok) return;
    setInviteDeleteError("");
    setInviteDeleteLoadingId(adminId);
    try {
      const token = localStorage.getItem("session_token");
      if (!token) {
        throw new Error("Missing session. Please sign in again.");
      }
      const { response, data } = await readJson(
        `${API_BASE.replace("/product", "")}/admin/invites/${adminId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) {
        throw new Error(data?.detail || "Delete failed.");
      }
      setAdminInvites((prev) => prev.filter((invite) => invite.id !== adminId));
    } catch (err) {
      setInviteDeleteError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setInviteDeleteLoadingId(null);
    }
  };

  const handleSearch = async () => {
    setError("");
    if (!subscriptionStatus.active && user?.role !== "admin") {
      setError("Active subscription required to scrape products.");
      return;
    }
    if (!query.trim()) {
      setError("Please enter a product name.");
      return;
    }
    setIsSearching(true);
    try {
      const token = localStorage.getItem("session_token");
      const { response, data } = await readJson(`${API_BASE}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    if (!subscriptionStatus.active && user?.role !== "admin") {
      setError("Active subscription required to scrape products.");
      return;
    }
    if (!scrapeName.trim()) {
      setError("Enter a product name.");
      return;
    }
    setIsSearching(true);
    try {
      const token = localStorage.getItem("session_token");
      const { response, data } = await readJson(`${API_BASE}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

  const handleSubscribe = async (planName) => {
    setSubscriptionError("");
    setSubscriptionLoading(true);
    setSelectedPlanName(planName);
    const token = localStorage.getItem("session_token");
    if (!token) {
      setSubscriptionError("Please sign in to subscribe.");
      setSubscriptionLoading(false);
      setSelectedPlanName("");
      return;
    }
    try {
      const { response, data } = await readJson(
        `${API_BASE.replace("/product", "")}/subscriptions/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ plan_name: planName }),
        }
      );
      if (!response.ok) {
        throw new Error(data?.detail || "Subscription request failed.");
      }
      if (!window.Razorpay) {
        throw new Error("Razorpay SDK not loaded.");
      }
      const options = {
        key: data.razorpay_key_id,
        subscription_id: data.razorpay_subscription_id,
        name: "Data Scrape",
        description: `${planName} Plan`,
        handler: async (res) => {
          const verify = await readJson(
            `${API_BASE.replace("/product", "")}/subscriptions/verify`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_payment_id: res.razorpay_payment_id,
                razorpay_subscription_id: res.razorpay_subscription_id,
                razorpay_signature: res.razorpay_signature,
              }),
            }
          );
          if (!verify.response.ok) {
            setSubscriptionError(
              verify.data?.detail || "Subscription verification failed."
            );
            setSubscriptionLoading(false);
            setSelectedPlanName("");
            return;
          }
          await fetchSubscriptionStatus();
          setLandingPage("dashboard");
          setSubscriptionLoading(false);
          setSelectedPlanName("");
        },
        modal: {
          ondismiss: () => {
            setSubscriptionLoading(false);
            setSelectedPlanName("");
          },
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setSubscriptionError(err instanceof Error ? err.message : "Subscription failed.");
      setSubscriptionLoading(false);
      setSelectedPlanName("");
    } finally {
      if (!window.Razorpay) {
        setSubscriptionLoading(false);
        setSelectedPlanName("");
      }
    }
  };

  if (authLoading) {
    return (
      <div className="admin-shell">
        <div className="admin-panel">
          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="text-slate-900">Loading session...</CardTitle>
              <CardDescription className="text-slate-600">
                Checking your access.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (user && user.role === "admin") {
    return (
      <AdminPanel
        activeView={activeView}
        setActiveView={setActiveView}
        adminMetricsState={adminMetricsState}
        adminUsers={adminUsers}
        adminInvites={adminInvites}
        adminMergedPlans={adminMergedPlans}
        adminVisitors={adminVisitors}
        adminVisitorRange={adminVisitorRange}
        setAdminVisitorRange={setAdminVisitorRange}
        adminVisitorsError={adminVisitorsError}
        adminRegistrations={adminRegistrations}
        adminRegistrationsError={adminRegistrationsError}
        adminUsersError={adminUsersError}
        adminUsersLoading={adminUsersLoading}
        handleLogout={handleLogout}
        handleExport={handleExport}
        handleInviteOpen={handleInviteOpen}
        inviteOpen={inviteOpen}
        handleInviteClose={handleInviteClose}
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        inviteName={inviteName}
        setInviteName={setInviteName}
        inviteUsername={inviteUsername}
        setInviteUsername={setInviteUsername}
        invitePhoneCode={invitePhoneCode}
        setInvitePhoneCode={setInvitePhoneCode}
        invitePhoneNumber={invitePhoneNumber}
        setInvitePhoneNumber={setInvitePhoneNumber}
        inviteError={inviteError}
        inviteSuccess={inviteSuccess}
        inviteCopyStatus={inviteCopyStatus}
        handleInviteCopy={handleInviteCopy}
        handleCreateInvite={handleCreateInvite}
        inviteLoading={inviteLoading}
        inviteDeleteError={inviteDeleteError}
        inviteDeleteLoadingId={inviteDeleteLoadingId}
        handleDeleteInvite={handleDeleteInvite}
        planEditOpen={planEditOpen}
        handlePlanEditClose={handlePlanEditClose}
        planEdit={planEdit}
        planEditAmount={planEditAmount}
        setPlanEditAmount={setPlanEditAmount}
        planEditDescription={planEditDescription}
        setPlanEditDescription={setPlanEditDescription}
        planEditCurrency={planEditCurrency}
        setPlanEditCurrency={setPlanEditCurrency}
        planEditDuration={planEditDuration}
        setPlanEditDuration={setPlanEditDuration}
        planEditFeaturesText={planEditFeaturesText}
        setPlanEditFeaturesText={setPlanEditFeaturesText}
        planEditError={planEditError}
        planEditLoading={planEditLoading}
        handlePlanSave={handlePlanSave}
        handlePlanEditOpen={handlePlanEditOpen}
      />
    );
  }

  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-20 w-full border-b border-white/60 bg-white/70 backdrop-blur">
          <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-6 py-5">
            <button
              type="button"
              className="flex items-center gap-3 text-left"
              onClick={() => handleLandingNav("dashboard")}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-sm font-semibold text-white">
                DS
              </div>
              <div>
                <p className="text-lg font-semibold">Data Scrape</p>
                <p className="text-xs text-slate-500">Product Intelligence</p>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-screen-2xl items-stretch gap-8 px-6 py-10 lg:grid-cols-[260px_1fr]">
          <aside className="h-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-gradient-to-b from-indigo-50 via-white to-white px-5 py-6">
              <p className="text-lg font-semibold text-slate-900">Data Scrape</p>
              <p className="mt-1 text-sm text-slate-500">Quick access to features</p>
            </div>
            <nav className="grid gap-2 px-4 py-5 text-sm">
              {[
                { label: "Dashboard", id: "dashboard", icon: BarChart3 },
                { label: "Scrape", id: "scrape", icon: FileSearch },
                { label: "Subscription", id: "subscriptions", icon: CreditCard },
                { label: "Billing", id: "billing", icon: CreditCard },
                { label: "History", id: "history", icon: Clock },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-active={landingPage === item.id}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left font-semibold transition ${
                    landingPage === item.id
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200/60"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                  onClick={() => handleLandingNav(item.id)}
                >
                  <span className="flex items-center gap-3">
                    <item.icon
                      className={`h-5 w-5 ${
                        landingPage === item.id ? "text-white" : "text-slate-500"
                      }`}
                    />
                    {item.label}
                  </span>
                  <span
                    className={`text-base ${
                      landingPage === item.id ? "text-white/90" : "text-slate-400"
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
            {landingPage === "dashboard" ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Dashboard
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                      Live Scraping Overview
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Track pricing changes, availability, and trend signals in one place.
                    </p>
                  </div>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-500"
                    onClick={() => handleLandingNav("scrape")}
                  >
                    New Scrape Job
                  </Button>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Total Products Scraped</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {dashboardTotals.total}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Available Products</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {dashboardTotals.inStock}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Out of Stock</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {dashboardTotals.outOfStock}
                    </p>
                  </div>
                </div>
                {!subscriptionStatus.active ? (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    No active subscription. Choose a plan to start scraping.
                    <Button
                      variant="outline"
                      className="ml-3 border-amber-300 text-amber-700 hover:bg-amber-100"
                      onClick={() => handleLandingNav("subscriptions")}
                    >
                      View Plans
                    </Button>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Active plan: {subscriptionStatus.plan_name || "Plan"}.
                    {subscriptionStatus.remaining_days !== undefined
                      ? ` ${subscriptionStatus.remaining_days} days remaining.`
                      : ""}
                  </div>
                )}
              </section>
            ) : null}

            {landingPage === "scrape" ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Scrape
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                      Scrape Products by Name
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Enter a product name and collect matching products.
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
                    disabled={isSearching || (!subscriptionStatus.active && user?.role !== "admin")}
                  >
                    {isSearching ? "Scraping..." : "Scrape Products"}
                  </Button>
                  {error ? <span className="text-sm text-rose-500">{error}</span> : null}
                </div>
                {cleanedResults.length > 0 ? (
                  <div className="mt-6">
                    <ProductGrid items={cleanedResults} onDelete={() => {}} exchangeRates={null} isLoading={isSearching} />
                  </div>
                ) : isSearching ? (
                  <div className="mt-6">
                    <ProductGrid items={[]} onDelete={() => {}} exchangeRates={null} isLoading />
                  </div>
                ) : null}
              </section>
            ) : null}

            {landingPage === "subscriptions" ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Subscription
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                      Current Plan
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Your active subscription details.
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {(() => {
                    const activePlan = mergedPlans.find(
                      (plan) =>
                        subscriptionStatus.active &&
                        subscriptionStatus.plan_name === plan.name
                    );
                    if (!activePlan) {
                      return (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          No active subscription yet.
                        </div>
                      );
                    }
                    return (
                      <PlanCard
                        key={activePlan.name}
                        plan={activePlan}
                        highlight={activePlan.highlight}
                        actionLabel="Active Plan"
                        actionDisabled
                        onAction={() => {}}
                        footer={
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Active
                          </span>
                        }
                      />
                    );
                  })()}
                </div>
                <div className="mt-6 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Start Date
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {subscriptionStatus.start_date
                        ? formatDate(subscriptionStatus.start_date)
                        : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      End Date
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {subscriptionStatus.end_date
                        ? formatDate(subscriptionStatus.end_date)
                        : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Days Left
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {typeof subscriptionStatus.remaining_days === "number"
                        ? `${subscriptionStatus.remaining_days} days`
                        : "-"}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {(() => {
                    const isExpired =
                      !subscriptionStatus.active ||
                      (typeof subscriptionStatus.remaining_days === "number" &&
                        subscriptionStatus.remaining_days <= 0);
                    const activeIndex = mergedPlans.findIndex(
                      (plan) => subscriptionStatus.plan_name === plan.name
                    );
                    const hasHigherPlan =
                      activeIndex >= 0 && activeIndex < mergedPlans.length - 1;

                    if (isExpired) {
                      return (
                        <Button
                          className="bg-emerald-600 text-white hover:bg-emerald-500"
                          onClick={() => handleLandingNav("billing")}
                        >
                          {subscriptionStatus.active ? "Renew Plan" : "Buy Plan"}
                        </Button>
                      );
                    }

                    if (!hasHigherPlan) {
                      return (
                        <div className="text-sm text-slate-500">
                          You are on the highest plan.
                        </div>
                      );
                    }

                    return (
                      <Button
                        variant="outline"
                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        onClick={() => handleLandingNav("billing")}
                      >
                        Upgrade Plan
                      </Button>
                    );
                  })()}
                </div>
              </section>
            ) : null}

            {landingPage === "billing" ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Billing
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                      All Plans
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Switch or upgrade your plan at any time.
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {mergedPlans.map((plan) => {
                    const isActive =
                      subscriptionStatus.active &&
                      subscriptionStatus.plan_name === plan.name;
                    const activeIndex = mergedPlans.findIndex(
                      (item) => item.name === subscriptionStatus.plan_name
                    );
                    const isOnHighestPlan =
                      subscriptionStatus.active &&
                      activeIndex >= 0 &&
                      activeIndex === mergedPlans.length - 1;
                    const isSelected =
                      selectedPlanName && selectedPlanName === plan.name;
                    const disableOther =
                      selectedPlanName && selectedPlanName !== plan.name;
                    return (
                      <PlanCard
                        key={plan.name}
                        plan={plan}
                        highlight={plan.highlight}
                        actionLabel={
                          isActive
                            ? "Active Plan"
                            : isSelected && subscriptionLoading
                            ? "Processing..."
                            : "Subscribe"
                        }
                        actionDisabled={
                          subscriptionLoading ||
                          isActive ||
                          disableOther ||
                          isOnHighestPlan
                        }
                        onAction={() => handleSubscribe(plan.name)}
                        footer={
                          isActive ? (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Active
                            </span>
                          ) : null
                        }
                      />
                    );
                  })}
                </div>
                {subscriptionError ? (
                  <p className="mt-4 text-sm text-rose-500">{subscriptionError}</p>
                ) : null}
              </section>
            ) : null}

            {landingPage === "history" ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">History</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">Recent Scrape Activity</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Review completed jobs and open previous results.
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 text-sm text-slate-600">
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
                              {group.query === "unknown" ? "Search Batch" : `Product: ${group.query}`}
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
              </section>
            ) : null}
          </main>
        </div>
      </div>
    );
  }

  if (landingPage === "signin") {
    return (
      <>
        {forgotOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-10">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Reset password</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    We will generate a temporary password for your account.
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                  onClick={handleForgotClose}
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Email
                  </label>
                  <Input
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="mt-2"
                  />
                </div>
                {forgotError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {forgotError}
                  </div>
                ) : null}
                {forgotSuccess ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <div className="font-semibold">Check your email</div>
                    <div className="mt-2 text-sm text-emerald-700">
                      We sent a reset link to {forgotSuccess.email}.
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-200 bg-white text-slate-700"
                  onClick={handleForgotClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-indigo-600 text-white hover:bg-indigo-500"
                  onClick={handleForgotSubmit}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? "Sending..." : "Reset password"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        <AuthSignIn
          email={email}
          password={password}
          authError={authError}
          onEmailChange={(event) => setEmail(event.target.value)}
          onPasswordChange={(event) => setPassword(event.target.value)}
          onSubmit={() => {
            setAuthView("signin");
            handleAuth();
          }}
          onGoHome={() => setLandingPage("home")}
          onGoSignup={() => {
            setAuthView("signup");
            setLandingPage("signup");
          }}
          onForgot={handleForgotOpen}
        />
      </>
    );
  }

  if (landingPage === "signup") {
    return (
      <AuthSignUp
        fullName={fullName}
        username={username}
        email={email}
        password={password}
        phoneCode={phoneCode}
        phoneNumber={phoneNumber}
        referralCode={referralCode}
        agreeTerms={agreeTerms}
        authError={authError}
        onFullNameChange={(event) => setFullName(event.target.value)}
        onUsernameChange={(event) => setUsername(event.target.value)}
        onEmailChange={(event) => setEmail(event.target.value)}
        onPasswordChange={(event) => setPassword(event.target.value)}
        onPhoneCodeChange={(event) => setPhoneCode(event.target.value)}
        onPhoneNumberChange={(event) => setPhoneNumber(event.target.value)}
        onReferralChange={(event) => setReferralCode(event.target.value)}
        onAgreeChange={(event) => setAgreeTerms(event.target.checked)}
        onSubmit={() => {
          if (!agreeTerms) {
            setAuthError("Please agree to the terms to continue.");
            return;
          }
          setAuthView("signup");
          handleAuth();
        }}
        onGoHome={() => setLandingPage("home")}
        onGoSignin={() => {
          setAuthView("signin");
          setLandingPage("signin");
        }}
      />
    );
  }

  if (landingPage === "reset") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-indigo-50 px-6 py-10 text-slate-900">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400"
              onClick={() => setLandingPage("signin")}
            >
              Back to Sign In
            </button>
            <h1 className="mt-4 text-3xl font-semibold text-slate-900">
              Reset Password
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Enter a new password for your account.
            </p>
            <div className="mt-6 grid gap-4">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                New Password
                <Input
                  className="mt-2 bg-white"
                  type="password"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  placeholder="Enter new password"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Confirm Password
                <Input
                  className="mt-2 bg-white"
                  type="password"
                  value={resetConfirm}
                  onChange={(event) => setResetConfirm(event.target.value)}
                  placeholder="Confirm new password"
                />
              </label>
            </div>
            <Button
              onClick={handleResetSubmit}
              className="mt-6 w-full bg-indigo-600 text-white hover:bg-indigo-500"
              disabled={resetLoading}
            >
              {resetLoading ? "Saving..." : "Set new password"}
            </Button>
            {resetError ? (
              <div className="mt-3 text-center text-xs text-rose-500">
                {resetError}
              </div>
            ) : null}
            {resetSuccess ? (
              <div className="mt-3 text-center text-xs text-emerald-600">
                Password updated. You can sign in now.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-indigo-50 text-slate-900">
      <header className="sticky top-0 z-20 w-full border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-sm font-semibold text-white">
            DS
          </div>
          <div>
            <p className="text-lg font-semibold">Data Scrape</p>
            <p className="text-xs text-slate-500">Product Intelligence</p>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <button
            type="button"
            className="transition hover:text-slate-600"
            onClick={() => scrollToSection("home")}
          >
            Home
          </button>
          <button
            type="button"
            className="transition hover:text-slate-600"
            onClick={() => scrollToSection("features")}
          >
            Features
          </button>
          <button
            type="button"
            className="transition hover:text-slate-600"
            onClick={() => scrollToSection("about")}
          >
            About
          </button>
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setAuthView("signin");
              setLandingPage("signin");
            }}
          >
            Sign In
          </Button>
          <Button
            className="bg-indigo-600 text-white hover:bg-indigo-500"
            onClick={() => {
              setAuthView("signup");
              setLandingPage("signup");
            }}
          >
            Sign Up
          </Button>
        </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-2xl px-6 pb-16 pt-10">
        <section id="home" className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
              Product Data Platform
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
              Scrape Products At Scale and Track Pricing Trends Instantly
            </h1>
            <p className="mt-4 max-w-xl text-sm text-slate-600 md:text-base">
              Data Scrape helps teams capture product listings, availability, and
              price changes from Amazon, Flipkart, and Reliance. Organize outputs,
              monitor trends, and stay ahead of the market.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                className="bg-indigo-600 text-white hover:bg-indigo-500"
                onClick={() => {
                  setAuthView("signup");
                  setLandingPage("signup");
                }}
              >
                Get Started
              </Button>
              <Button
                variant="outline"
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setAuthView("signin");
                  setLandingPage("signin");
                }}
              >
                Sign In
              </Button>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                "Daily price monitoring",
                "Verified data sources",
                "Exports for BI teams",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-indigo-500/10 via-sky-400/10 to-purple-500/10 p-6 shadow-sm">
            <div className="rounded-2xl bg-white p-4 text-sm shadow-sm">
              <p className="text-slate-500">Platform Coverage</p>
              <div className="mt-3 grid gap-2">
                {["Amazon", "Flipkart", "Reliance"].map((platformName) => (
                  <div
                    key={platformName}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <span className="text-slate-700">{platformName}</span>
                    <span className="text-xs text-slate-500">Active</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 rounded-2xl bg-white p-4 text-sm shadow-sm">
              <p className="text-slate-500">What you get</p>
              <ul className="mt-3 grid gap-2 text-slate-600">
                <li>Product name, price, discount, availability</li>
                <li>Daily snapshots + history</li>
                <li>Subscription plans for teams</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="features" className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            "Smart scraping with retry logic",
            "Clean JSON outputs + CSV exports",
            "Role-based access for teams",
          ].map((feature) => (
            <div key={feature} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{feature}</p>
              <p className="mt-2 text-sm text-slate-600">
                Built for scale and reliable data capture.
              </p>
            </div>
          ))}
        </section>

        <section id="about" className="mt-14 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">About</h2>
          <p className="mt-3 text-sm text-slate-600">
            We help teams monitor marketplaces and stay ahead with accurate,
            structured product data.
          </p>
        </section>

      </main>
    </div>
  );
}

