import { ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";

export default function PlanCard({
  plan,
  actionLabel,
  onAction,
  actionDisabled = false,
  highlight = false,
  footer,
}) {
  const features = Array.isArray(plan.features) ? plan.features : [];
  return (
    <div
      className={`rounded-2xl border bg-white p-6 shadow-sm ${
        highlight ? "border-indigo-200" : "border-slate-200"
      }`}
    >
      <p className="text-lg font-semibold text-slate-900">{plan.name}</p>
      <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
      <p className="mt-6 text-3xl font-semibold text-slate-900">{plan.price}</p>
      <ul className="mt-5 space-y-3 text-sm text-slate-600">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Button
          className="w-full bg-indigo-600 text-white hover:bg-indigo-500"
          disabled={actionDisabled}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}
