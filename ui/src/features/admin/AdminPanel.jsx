import { useState } from "react";
import {
  CreditCard,
  FileText,
  Home,
  LogOut,
  Plus,
  Users,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import PlanCard from "../../components/PlanCard";
import { formatDate } from "../../utils";

export default function AdminPanel({
  activeView,
  setActiveView,
  adminMetricsState,
  adminUsers,
  adminInvites,
  adminMergedPlans,
  adminVisitors,
  adminVisitorRange,
  setAdminVisitorRange,
  adminVisitorsError,
  adminRegistrations,
  adminRegistrationsError,
  adminUsersError,
  adminUsersLoading,
  handleLogout,
  handleExport,
  handleInviteOpen,
  inviteOpen,
  handleInviteClose,
  inviteEmail,
  setInviteEmail,
  inviteName,
  setInviteName,
  inviteUsername,
  setInviteUsername,
  invitePhoneCode,
  setInvitePhoneCode,
  invitePhoneNumber,
  setInvitePhoneNumber,
  inviteError,
  inviteSuccess,
  inviteCopyStatus,
  handleInviteCopy,
  handleCreateInvite,
  inviteLoading,
  inviteDeleteError,
  inviteDeleteLoadingId,
  handleDeleteInvite,
  planEditOpen,
  handlePlanEditClose,
  planEdit,
  planEditAmount,
  setPlanEditAmount,
  planEditDescription,
  setPlanEditDescription,
  planEditCurrency,
  setPlanEditCurrency,
  planEditDuration,
  setPlanEditDuration,
  planEditFeaturesText,
  setPlanEditFeaturesText,
  planEditError,
  planEditLoading,
  handlePlanSave,
  handlePlanEditOpen,
}) {
  const [visitorSelection, setVisitorSelection] = useState(null);
  const [snapshotTab, setSnapshotTab] = useState("users");
  const percentChange = (current, previous) => {
    if (previous <= 0) {
      return current > 0 ? null : 0;
    }
    return ((current - previous) / previous) * 100;
  };

  const rangeDays = Number(adminVisitorRange) || 90;
  const visitorSeries = Array.isArray(adminVisitors) ? adminVisitors : [];
  const registrationSeries = Array.isArray(adminRegistrations)
    ? adminRegistrations
    : [];

  const currentVisitors = visitorSeries.slice(-rangeDays);
  const previousVisitors = visitorSeries.slice(-rangeDays * 2, -rangeDays);
  const currentRegistrations = registrationSeries.slice(-rangeDays);
  const previousRegistrations = registrationSeries.slice(-rangeDays * 2, -rangeDays);

  const visitorValues = currentVisitors.map((item) => Number(item.count) || 0);
  const visitorMax = Math.max(...visitorValues, 1);
  const visitorTotal = visitorValues.reduce((sum, value) => sum + value, 0);
  const visitorLatest = visitorValues.length
    ? visitorValues[visitorValues.length - 1]
    : 0;
  const visitorLabels = currentVisitors.map((item) => item.date);

  const registrationMap = new Map(
    currentRegistrations.map((item) => [item.date, Number(item.count) || 0])
  );
  const registrationValues = visitorLabels.length
    ? visitorLabels.map((date) => registrationMap.get(date) || 0)
    : currentRegistrations.map((item) => Number(item.count) || 0);

  const visitorsPrevTotal = previousVisitors.reduce(
    (sum, item) => sum + (Number(item.count) || 0),
    0
  );
  const registrationsTotal = registrationValues.reduce((sum, value) => sum + value, 0);
  const registrationsPrevTotal = previousRegistrations.reduce(
    (sum, item) => sum + (Number(item.count) || 0),
    0
  );

  const revenueDelta = 0;
  const activeAccountsPrev = Math.max(
    0,
    Number(adminMetricsState.total_users || 0) - registrationsTotal
  );
  const activeAccountsDelta = percentChange(
    Number(adminMetricsState.total_users || 0),
    activeAccountsPrev
  );
  const growthRate = adminMetricsState.total_users
    ? (adminMetricsState.active_subscribers / adminMetricsState.total_users) * 100
    : 0;
  const growthRatePrev = activeAccountsPrev
    ? (adminMetricsState.active_subscribers / activeAccountsPrev) * 100
    : 0;
  const growthRateDelta = percentChange(growthRate, growthRatePrev);

  const formatDelta = (value) => {
    if (value == null) return "—";
    if (Math.abs(value) < 0.05) return "0.0%";
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const deltaClass = (value) => {
    if (value == null) return "muted";
    if (Math.abs(value) < 0.05) return "neutral";
    return value < 0 ? "muted" : "";
  };

  const shouldShowDelta = (value) => value != null && Math.abs(value) >= 0.05;
  const tickCount = Math.min(7, visitorLabels.length);
  const tickStep = tickCount > 1 ? Math.floor((visitorLabels.length - 1) / (tickCount - 1)) : 1;
  const ticks = visitorLabels
    .filter((_, index) => index % tickStep === 0)
    .slice(0, tickCount)
    .map((label) => {
      const date = new Date(label);
      return date.toLocaleString("en-US", { month: "short", day: "numeric" });
    });

  const buildCurvePath = (values, height, padding) => {
    if (!values.length) return "";
    const width = 600;
    const step = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;
    const points = values.map((value, index) => {
      const x = padding + index * step;
      const y = height - padding - (value / visitorMax) * (height - padding * 2);
      return { x, y };
    });
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      d += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  };

  const primaryPath = buildCurvePath(visitorValues, 200, 24);
  const secondaryPath = buildCurvePath(registrationValues, 200, 24);
  const areaPath = primaryPath ? `${primaryPath} L 600 200 L 0 200 Z` : "";
  const pointStep = visitorValues.length > 1 ? (600 - 48) / (visitorValues.length - 1) : 0;
  const pointY = (value) => 200 - 24 - (value / visitorMax) * (200 - 48);
  const selectedIndex =
    visitorSelection && Number.isInteger(visitorSelection.index)
      ? Math.max(0, Math.min(visitorValues.length - 1, visitorSelection.index))
      : null;
  const selectedVisitorValue =
    selectedIndex != null ? visitorValues[selectedIndex] || 0 : 0;
  const selectedRegistrationValue =
    selectedIndex != null ? registrationValues[selectedIndex] || 0 : 0;
  const selectedLabel =
    selectedIndex != null && visitorLabels[selectedIndex]
      ? new Date(visitorLabels[selectedIndex]).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "";
  const selectedX = selectedIndex != null ? 24 + selectedIndex * pointStep : 0;
  const selectedY = selectedIndex != null ? pointY(selectedVisitorValue) : 0;
  const tooltipLeftPx = Math.min(600 - 60, Math.max(60, selectedX));
  const tooltipTopPx = Math.min(200 - 20, Math.max(30, selectedY));
  const tooltipLeftPct = (tooltipLeftPx / 600) * 100;
  const tooltipTopPct = (tooltipTopPx / 200) * 100;

  const handleChartClick = (event) => {
    if (!visitorValues.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const relative = Math.max(24, Math.min(600 - 24, (x / rect.width) * 600));
    const index = Math.round((relative - 24) / (pointStep || 1));
    const safeIndex = Math.max(0, Math.min(visitorValues.length - 1, index));
    setVisitorSelection({ index: safeIndex });
  };
  return (
    <div className="admin-shell">
      <div className="admin-panel">
        {inviteOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-10">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Create invite</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Generate a temporary password for a new user.
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                  onClick={handleInviteClose}
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
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="mt-2"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Full Name
                    </label>
                    <Input
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="Full name"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Username
                    </label>
                    <Input
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      placeholder="username"
                      className="mt-2"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Phone Code
                    </label>
                    <Input
                      value={invitePhoneCode}
                      onChange={(e) => setInvitePhoneCode(e.target.value)}
                      placeholder="+91"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Phone Number
                    </label>
                    <Input
                      value={invitePhoneNumber}
                      onChange={(e) => setInvitePhoneNumber(e.target.value)}
                      placeholder="9876543210"
                      className="mt-2"
                    />
                  </div>
                </div>

                {inviteError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {inviteError}
                  </div>
                ) : null}

                {inviteSuccess ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <div className="font-semibold">Invite created</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.2em] text-emerald-500">
                      Temporary Credentials
                    </div>
                    <div className="mt-2 text-sm text-emerald-700">
                      Email: {inviteSuccess.email}
                    </div>
                    <div className="text-sm text-emerald-700">
                      Password: {inviteSuccess.temp_password}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-emerald-200 bg-white text-emerald-700"
                        onClick={handleInviteCopy}
                      >
                        Copy credentials
                      </Button>
                      {inviteCopyStatus ? (
                        <span className="text-xs text-emerald-600">
                          {inviteCopyStatus}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-200 bg-white text-slate-700"
                  onClick={handleInviteClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-indigo-600 text-white hover:bg-indigo-500"
                  onClick={handleCreateInvite}
                  disabled={inviteLoading}
                >
                  {inviteLoading ? "Creating..." : "Create invite"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {planEditOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-10">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Edit pricing</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Update pricing details for {planEdit?.name}.
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                  onClick={handlePlanEditClose}
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Amount
                  </label>
                  <Input
                    value={planEditAmount}
                    onChange={(e) => setPlanEditAmount(e.target.value)}
                    placeholder="1999"
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Description
                  </label>
                  <textarea
                    value={planEditDescription}
                    onChange={(e) => setPlanEditDescription(e.target.value)}
                    placeholder="Short plan description"
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Currency
                    </label>
                    <Input
                      value={planEditCurrency}
                      onChange={(e) => setPlanEditCurrency(e.target.value)}
                      placeholder="INR"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Duration (days)
                    </label>
                    <Input
                      value={planEditDuration}
                      onChange={(e) => setPlanEditDuration(e.target.value)}
                      placeholder="30"
                      className="mt-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Features (one per line)
                  </label>
                  <textarea
                    value={planEditFeaturesText}
                    onChange={(e) => setPlanEditFeaturesText(e.target.value)}
                    placeholder="Feature 1&#10;Feature 2"
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    rows={4}
                  />
                </div>
                {planEditError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {planEditError}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-200 bg-white text-slate-700"
                  onClick={handlePlanEditClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-indigo-600 text-white hover:bg-indigo-500"
                  onClick={handlePlanSave}
                  disabled={planEditLoading}
                >
                  {planEditLoading ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <section className="admin-layout admin-layout-v2">
          <aside className="admin-sidebar admin-sidebar-v2">
            <div>
              <div className="sidebar-brand">
                <span className="sidebar-logo">DS</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Data Scrape</p>
                  <p className="text-xs text-slate-500">Admin Console</p>
                </div>
              </div>
              <div className="sidebar-group">
                <p className="sidebar-title mb-6  ">Overview</p>
                <nav className="admin-nav">
                  <button
                    type="button"
                    data-active={activeView === "dashboard"}
                    onClick={() => setActiveView("dashboard")}
                  >
                    <Home className="h-4 w-4" />
                    Dashboard
                  </button>
                  <button
                    type="button"
                    data-active={activeView === "users"}
                    onClick={() => setActiveView("users")}
                  >
                    <Users className="h-4 w-4" />
                    Users
                  </button>
                  <button
                    type="button"
                    data-active={activeView === "invites"}
                    onClick={() => setActiveView("invites")}
                  >
                    <FileText className="h-4 w-4" />
                    Invites
                  </button>
                </nav>
              </div>
              <div className="sidebar-group">
                <p className="sidebar-title">Billing</p>
                <nav className="admin-nav">
                  <button
                    type="button"
                    data-active={activeView === "pricing"}
                    onClick={() => setActiveView("pricing")}
                  >
                    <CreditCard className="h-4 w-4" />
                    Pricing
                  </button>
                </nav>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-slate-200 bg-white text-slate-700"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </aside>

          <div className="space-y-6 admin-main-v2">
            <header className="admin-header admin-header-v2">
              <div>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                  Admin Dashboard
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  className="border-slate-200 bg-white text-slate-700"
                  onClick={handleExport}
                >
                  Export
                </Button>
                <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={handleInviteOpen}>
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Admin
                </Button>
              </div>
            </header>

            {activeView === "dashboard" ? (
              <div className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <Card className="admin-card">
                    <CardHeader>
                      <CardTitle>Total Revenue</CardTitle>
                      <CardDescription>Trending up this month</CardDescription>
                    </CardHeader>
                    <CardContent className="text-3xl font-semibold text-slate-900">
                      INR {adminMetricsState.revenue.toLocaleString()}
                      {shouldShowDelta(revenueDelta) ? (
                        <span className={`metric-pill ${deltaClass(revenueDelta)}`}>
                          {formatDelta(revenueDelta)}
                        </span>
                      ) : null}
                    </CardContent>
                  </Card>
                  <Card className="admin-card">
                    <CardHeader>
                      <CardTitle>Subscribed Users</CardTitle>
                      <CardDescription>Currently active subscriptions</CardDescription>
                    </CardHeader>
                    <CardContent className="text-3xl font-semibold text-slate-900">
                      {adminMetricsState.active_subscribers}
                    </CardContent>
                  </Card>
                  <Card className="admin-card">
                    <CardHeader>
                      <CardTitle>Active Accounts</CardTitle>
                      <CardDescription>Strong retention</CardDescription>
                    </CardHeader>
                    <CardContent className="text-3xl font-semibold text-slate-900">
                      {adminMetricsState.total_users}
                      {shouldShowDelta(activeAccountsDelta) ? (
                        <span className={`metric-pill ${deltaClass(activeAccountsDelta)}`}>
                          {formatDelta(activeAccountsDelta)}
                        </span>
                      ) : null}
                    </CardContent>
                  </Card>
                  <Card className="admin-card">
                    <CardHeader>
                      <CardTitle>Growth Rate</CardTitle>
                      <CardDescription>Meets projections</CardDescription>
                    </CardHeader>
                    <CardContent className="text-3xl font-semibold text-slate-900">
                      {adminMetricsState.total_users
                        ? `${Math.round(growthRate)}%`
                        : "0%"}
                      {shouldShowDelta(growthRateDelta) ? (
                        <span className={`metric-pill ${deltaClass(growthRateDelta)}`}>
                          {formatDelta(growthRateDelta)}
                        </span>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>

                <Card className="admin-card">
                  <CardHeader className="card-header-row ">
                    <div>
                      <CardTitle>Total Visitors</CardTitle>
                      <CardDescription className="mt-2">
                        Total for the last 3 months
                      </CardDescription>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        <span className="text-2xl font-semibold text-slate-900">
                          {visitorTotal.toLocaleString()}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          Latest: {visitorLatest.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="range-tabs mt-3">
                      <button
                        type="button"
                        className={`range-tab ${adminVisitorRange === 90 ? "active" : ""}`}
                        onClick={() => setAdminVisitorRange(90)}
                      >
                        Last 3 months
                      </button>
                      <button
                        type="button"
                        className={`range-tab ${adminVisitorRange === 30 ? "active" : ""}`}
                        onClick={() => setAdminVisitorRange(30)}
                      >
                        Last 30 days
                      </button>
                      <button
                        type="button"
                        className={`range-tab ${adminVisitorRange === 7 ? "active" : ""}`}
                        onClick={() => setAdminVisitorRange(7)}
                      >
                        Last 7 days
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="area-chart">
                      <svg
                        viewBox="0 0 600 200"
                        preserveAspectRatio="none"
                        onClick={handleChartClick}
                        className="cursor-pointer"
                      >
                        <defs>
                          <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>
                        {areaPath ? (
                          <path
                            d={areaPath}
                            fill="url(#area-fill)"
                            stroke="#64748b"
                            strokeWidth="2"
                          />
                        ) : (
                          <rect x="0" y="0" width="600" height="200" fill="url(#area-fill)" />
                        )}
                        {secondaryPath ? (
                          <path
                            d={secondaryPath}
                            fill="none"
                            stroke="#0f172a"
                            strokeWidth="2"
                          />
                        ) : null}
                        {selectedIndex != null ? (
                          <circle
                            cx={selectedX}
                            cy={selectedY}
                            r="6"
                            fill="#0f172a"
                            stroke="#ffffff"
                            strokeWidth="2"
                          />
                        ) : null}
                      </svg>
                      {selectedIndex != null ? (
                        <div
                          className="chart-tooltip"
                          style={{
                            left: `${tooltipLeftPct}%`,
                            top: `${tooltipTopPct}%`,
                          }}
                        >
                          <div className="chart-tooltip-label">{selectedLabel}</div>
                          <div className="chart-tooltip-value">
                            Visitors: {selectedVisitorValue.toLocaleString()}
                          </div>
                          <div className="chart-tooltip-sub">
                            Registered: {selectedRegistrationValue.toLocaleString()}
                          </div>
                        </div>
                      ) : null}
                      {adminVisitorsError ? (
                        <div className="mt-4 text-xs text-rose-500">{adminVisitorsError}</div>
                      ) : null}
                      {adminRegistrationsError ? (
                        <div className="mt-1 text-xs text-rose-500">{adminRegistrationsError}</div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-slate-500" />
                          Visitors
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-slate-900" />
                          Registered users
                        </span>
                      </div>
                      <div className="area-axis">
                        {ticks.length > 0 ? (
                          ticks.map((label) => <span key={label}>{label}</span>)
                        ) : (
                          <span>No visitor data yet.</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="admin-card">
                  <CardHeader className="card-header-row">
                    <div>
                      <CardTitle>
                        {snapshotTab === "users"
                          ? "Recent Users"
                          : snapshotTab === "plans"
                          ? "Plan Snapshot"
                          : "Recent Invites"}
                      </CardTitle>
                      <CardDescription className="mt-3 mb-4">
                        {snapshotTab === "users"
                          ? "Latest registered accounts"
                          : snapshotTab === "plans"
                          ? "Current configured plans"
                          : "Latest invited admins"}
                      </CardDescription>
                    </div>
                    <div className="range-tabs">
                      <button
                        type="button"
                        className={`range-tab ${snapshotTab === "users" ? "active" : ""}`}
                        onClick={() => setSnapshotTab("users")}
                      >
                        Users
                      </button>
                      <button
                        type="button"
                        className={`range-tab ${snapshotTab === "plans" ? "active" : ""}`}
                        onClick={() => setSnapshotTab("plans")}
                      >
                        Plans
                      </button>
                      <button
                        type="button"
                        className={`range-tab ${snapshotTab === "invites" ? "active" : ""}`}
                        onClick={() => setSnapshotTab("invites")}
                      >
                        Invites
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="table-wrap">
                      <table className="admin-table">
                        {snapshotTab === "users" ? (
                          <>
                            <thead>
                              <tr>
                                <th>User</th>
                                <th>Plan</th>
                                <th>Status</th>
                                <th>Remaining</th>
                                <th>End Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {adminUsers.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="py-6 text-center text-sm text-slate-500">
                                    No users found yet.
                                  </td>
                                </tr>
                              ) : (
                                adminUsers.slice(0, 5).map((user) => (
                                  <tr key={user.id}>
                                    <td>
                                      <div className="font-semibold text-slate-900">
                                        {user.full_name || user.username || "User"}
                                      </div>
                                      <div className="text-xs text-slate-500">{user.email}</div>
                                    </td>
                                    <td>
                                      <span className="chip">{user.plan_name || "None"}</span>
                                    </td>
                                    <td>
                                      <span className={`status-pill ${user.status === "active" ? "success" : "warning"}`}>
                                        {user.status || "pending"}
                                      </span>
                                    </td>
                                    <td>
                                      {typeof user.remaining_days === "number"
                                        ? `${user.remaining_days} days`
                                        : "-"}
                                    </td>
                                    <td>{user.end_date ? formatDate(user.end_date) : "-"}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </>
                        ) : null}
                        {snapshotTab === "plans" ? (
                          <>
                            <thead>
                              <tr>
                                <th>Plan</th>
                                <th>Price</th>
                                <th>Duration</th>
                                <th>Features</th>
                              </tr>
                            </thead>
                            <tbody>
                              {adminMergedPlans.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-6 text-center text-sm text-slate-500">
                                    No plans found yet.
                                  </td>
                                </tr>
                              ) : (
                                adminMergedPlans.slice(0, 5).map((plan) => (
                                  <tr key={plan.name}>
                                    <td className="font-semibold text-slate-900">{plan.name}</td>
                                    <td>{plan.price}</td>
                                    <td>{plan.duration_days ? `${plan.duration_days} days` : "-"}</td>
                                    <td>{Array.isArray(plan.features) ? plan.features.length : 0}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </>
                        ) : null}
                        {snapshotTab === "invites" ? (
                          <>
                            <thead>
                              <tr>
                                <th>Admin</th>
                                <th>Invited By</th>
                                <th>Invited At</th>
                                <th>Contact</th>
                              </tr>
                            </thead>
                            <tbody>
                              {adminInvites.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-6 text-center text-sm text-slate-500">
                                    No invites found yet.
                                  </td>
                                </tr>
                              ) : (
                                adminInvites.slice(0, 5).map((invite) => (
                                  <tr key={invite.id}>
                                    <td>
                                      <div className="font-semibold text-slate-900">
                                        {invite.full_name || invite.username || "Admin"}
                                      </div>
                                      <div className="text-xs text-slate-500">{invite.email}</div>
                                    </td>
                                    <td>{invite.invited_by || "-"}</td>
                                    <td>{invite.invited_at ? formatDate(invite.invited_at) : "-"}</td>
                                    <td>
                                      {invite.phone_code && invite.phone_number
                                        ? `${invite.phone_code} ${invite.phone_number}`
                                        : "-"}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </>
                        ) : null}
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {activeView === "pricing" ? (
              <Card className="admin-card">
                <CardHeader>
                  <CardTitle className="text-slate-900">Plan Pricing</CardTitle>
                  <CardDescription className="text-slate-600">
                    Update pricing and feature access for each plan.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {adminMergedPlans.map((plan) => (
                      <PlanCard
                        key={plan.name}
                        plan={plan}
                        highlight={plan.highlight}
                        actionLabel="Edit Pricing"
                        onAction={() => handlePlanEditOpen(plan)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {activeView === "users" ? (
              <Card className="admin-card">
                <CardHeader>
                  <CardTitle className="text-slate-900">Users</CardTitle>
                  <CardDescription className="text-slate-600">
                    Track active plans and remaining subscription days.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {adminUsersError ? (
                    <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {adminUsersError}
                    </div>
                  ) : null}
                  {adminUsers.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {adminUsersLoading ? "Loading users..." : "No user records found yet."}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-400">
                            <th className="py-2 pr-4">User</th>
                            <th className="py-2 pr-4">Plan</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Remaining</th>
                            <th className="py-2 pr-4">End Date</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          {adminUsers.map((u) => (
                            <tr key={u.id} className="border-t border-slate-100">
                              <td className="py-3 pr-4">
                                <div className="font-semibold text-slate-900">
                                  {u.full_name || u.username || "User"}
                                </div>
                                <div className="text-xs text-slate-500">{u.email}</div>
                              </td>
                              <td className="py-3 pr-4">{u.plan_name || "None"}</td>
                              <td className="py-3 pr-4 capitalize">{u.status || "none"}</td>
                              <td className="py-3 pr-4">
                                {typeof u.remaining_days === "number"
                                  ? `${u.remaining_days} days`
                                  : "-"}
                              </td>
                              <td className="py-3 pr-4">
                                {u.end_date ? formatDate(u.end_date) : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {activeView === "invites" ? (
              <Card className="admin-card">
                <CardHeader>
                  <CardTitle className="text-slate-900">Admin Invites</CardTitle>
                  <CardDescription className="text-slate-600">
                    Invited admin accounts and their status.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {inviteDeleteError ? (
                    <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {inviteDeleteError}
                    </div>
                  ) : null}
                  {adminInvites.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No invited admins yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-400">
                            <th className="py-2 pr-4">Admin</th>
                            <th className="py-2 pr-4">Invited By</th>
                            <th className="py-2 pr-4">Invited At</th>
                            <th className="py-2 pr-4">Contact</th>
                            <th className="py-2 pr-4">Action</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          {adminInvites.map((u) => (
                            <tr key={u.id} className="border-t border-slate-100">
                              <td className="py-3 pr-4">
                                <div className="font-semibold text-slate-900">
                                  {u.full_name || u.username || "Admin"}
                                </div>
                                <div className="text-xs text-slate-500">{u.email}</div>
                              </td>
                              <td className="py-3 pr-4">{u.invited_by || "-"}</td>
                              <td className="py-3 pr-4">
                                {u.invited_at ? formatDate(u.invited_at) : "-"}
                              </td>
                              <td className="py-3 pr-4">
                                {u.phone_code && u.phone_number
                                  ? `${u.phone_code} ${u.phone_number}`
                                  : "-"}
                              </td>
                              <td className="py-3 pr-4">
                                <button
                                  type="button"
                                  className="delete"
                                  onClick={() => handleDeleteInvite(u.id)}
                                  disabled={inviteDeleteLoadingId === u.id}
                                >
                                  {inviteDeleteLoadingId === u.id
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
