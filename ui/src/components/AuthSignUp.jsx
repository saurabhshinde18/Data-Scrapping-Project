import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function AuthSignUp({
  fullName,
  username,
  email,
  password,
  phoneCode,
  phoneNumber,
  referralCode,
  agreeTerms,
  authError,
  onFullNameChange,
  onUsernameChange,
  onEmailChange,
  onPasswordChange,
  onPhoneCodeChange,
  onPhoneNumberChange,
  onReferralChange,
  onAgreeChange,
  onSubmit,
  onGoHome,
  onGoSignin,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-indigo-50 px-6 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-start justify-center">
        <div className="w-full max-w-3xl rounded-2xl bg-white p-8 shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400"
              onClick={onGoHome}
            >
              Back to Home
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-indigo-600"
              onClick={onGoSignin}
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
                    onChange={onFullNameChange}
                    placeholder="John Doe"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Username
                  <Input
                    className="mt-2 bg-white"
                    value={username}
                    onChange={onUsernameChange}
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
                    onChange={onEmailChange}
                    placeholder="john@example.com"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Phone Number
                  <div className="mt-2 flex gap-2">
                    <select
                      value={phoneCode}
                      onChange={onPhoneCodeChange}
                      className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
                    >
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                    </select>
                    <Input
                      className="bg-white"
                      value={phoneNumber}
                      onChange={onPhoneNumberChange}
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
                  onChange={onPasswordChange}
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
                  onChange={onReferralChange}
                  placeholder="Enter referral code"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={agreeTerms}
                onChange={onAgreeChange}
              />
              I agree to the Terms and Conditions and Privacy Policy
            </label>
          </div>

          <Button
            onClick={onSubmit}
            className="mt-6 w-full bg-indigo-600 text-white hover:bg-indigo-500"
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
