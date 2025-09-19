export const metadata = {
  title: "Terms",
  description: "VehicleLab terms of service."
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">Terms of Service</h1>
      <div className="mt-6 space-y-6 text-slate-600 dark:text-slate-300">
        <p>
          By using VehicleLab you agree to use the sandbox responsibly and comply with all applicable laws. Paid plans provide
          access to premium features as long as subscriptions remain in good standing. We may update the service from time to
          time; material changes will be communicated via email or the in-app changelog.
        </p>
        <p>Questions? Reach out to support@vehicellab.dev.</p>
      </div>
    </div>
  );
}
