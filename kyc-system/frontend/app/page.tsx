import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6 text-center">
      <h1 className="text-4xl font-bold">KYC Verification Platform</h1>
      <div className="flex gap-4 justify-center mt-8">
        <Link href="/kyc" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
          User Verification
        </Link>
        <Link href="/admin" className="bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-900">
          Admin Dashboard
        </Link>
      </div>
    </main>
  );
}
