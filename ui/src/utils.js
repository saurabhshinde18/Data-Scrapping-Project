export const formatPrice = (value) => {
  if (!value) return "—";
  if (value.includes("₹")) return value;
  return `₹${value}`;
};

export const formatDate = (value) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export const normalizeAvailability = (value) => {
  if (!value) return "Other";
  const lowered = String(value).toLowerCase();
  if (lowered.includes("blocked")) return "Blocked";
  if (lowered.includes("in stock")) return "In stock";
  return "Other";
};

export const normalizeDiscount = (value) => {
  if (!value) return "—";
  const trimmed = String(value).trim();
  if (!trimmed) return "—";
  if (trimmed.includes("%") || trimmed.toLowerCase().includes("off")) {
    return trimmed;
  }
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed}%`;
  }
  return trimmed;
};
