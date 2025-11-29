import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/dues" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition duration-200 border-l-4 border-blue-500">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Manage Dues</h2>
          <p className="text-gray-600">Create, edit, and view association dues.</p>
        </Link>

        <Link href="/admin/users" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition duration-200 border-l-4 border-green-500">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">User Management</h2>
          <p className="text-gray-600">View users and generate registration codes.</p>
        </Link>

        <Link href="/admin/broadcast" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition duration-200 border-l-4 border-purple-500">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Broadcasts</h2>
          <p className="text-gray-600">Send notifications to all members.</p>
        </Link>
      </div>
    </div>
  );
}