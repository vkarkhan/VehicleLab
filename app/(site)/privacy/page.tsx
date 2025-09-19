export const metadata = {
  title: "Privacy",
  description: "How VehicleLab handles data and analytics."
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">Privacy Policy</h1>
      <div className="mt-6 space-y-6 text-slate-600 dark:text-slate-300">
        <p>
          VehicleLab collects the minimal amount of information required to operate the service. Analytics are optional and can
          be disabled via environment configuration. Payment data is processed securely by Stripe and Razorpay; we never store
          raw card details.
        </p>
        <p>
          For questions or requests under applicable privacy laws, contact privacy@vehicellab.dev.
        </p>
      </div>
    </div>
  );
}
