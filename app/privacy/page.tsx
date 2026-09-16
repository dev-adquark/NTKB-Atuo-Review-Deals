import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-neutral-700">
      <h1 className="text-2xl font-semibold text-neutral-900">Privacy Policy</h1>
      <p className="mt-4">
        This is a placeholder privacy policy for the NTKB Auto Review Deals demo environment. Replace this page with
        your organization&rsquo;s real privacy policy before going to production, covering what data is collected
        (including analytics and affiliate click tracking, if enabled), how it is used, and how visitors can contact
        you about their data.
      </p>
    </div>
  );
}
