import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function AuthSignIn({
  email,
  password,
  authError,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoHome,
  onGoSignup,
  onForgot,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-indigo-50 px-6 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <button
            type="button"
            className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400"
            onClick={onGoHome}
          >
            Back to Home
          </button>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">
            Welcome Back
          </h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to your account</p>
          <div className="mt-6 grid gap-4">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Email
              <Input
                className="mt-2 bg-white"
                value={email}
                onChange={onEmailChange}
                placeholder="name@company.com"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Password
              <Input
                className="mt-2 bg-white"
                type="password"
                value={password}
                onChange={onPasswordChange}
                placeholder="Enter your password"
              />
            </label>
            <button
              type="button"
              className="text-left text-sm font-medium text-indigo-600"
              onClick={onForgot}
            >
              Forgot password?
            </button>
          </div>
          <Button
            onClick={onSubmit}
            className="mt-6 w-full bg-indigo-600 text-white hover:bg-indigo-500"
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
              onClick={onGoSignup}
            >
              Create one now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
