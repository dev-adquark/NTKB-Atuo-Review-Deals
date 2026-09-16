import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin Login — NTKB Auto Review Deals",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold text-neutral-900">NTKB Auto Review Deals</h1>
          <p className="text-sm text-neutral-500">Sign in to the admin console</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
