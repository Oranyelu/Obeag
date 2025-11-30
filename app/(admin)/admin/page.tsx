import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/dues" className="block p-6 bg-card rounded-lg shadow-md hover:shadow-lg transition duration-200 border-l-4 border-primary border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-2">Manage Dues</h2>
          <p className="text-muted-foreground">Create, edit, and view association dues.</p>
        </Link>

        <Link href="/admin/users" className="block p-6 bg-card rounded-lg shadow-md hover:shadow-lg transition duration-200 border-l-4 border-green-500 border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-2">User Management</h2>
          <p className="text-muted-foreground">View users and generate registration codes.</p>
        </Link>

        <Link href="/admin/finances" className="block p-6 bg-card rounded-lg shadow-md hover:shadow-lg transition duration-200 border-l-4 border-yellow-500 border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-2">Financial Records</h2>
          <p className="text-muted-foreground">Track income, expenses, and net balance.</p>
        </Link>

        <Link href="/admin/broadcast" className="block p-6 bg-card rounded-lg shadow-md hover:shadow-lg transition duration-200 border-l-4 border-accent border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-2">Broadcasts</h2>
          <p className="text-muted-foreground">Send notifications to all members.</p>
        </Link>

        <Link href="/admin/reminders" className="block p-6 bg-card rounded-lg shadow-md hover:shadow-lg transition duration-200 border-l-4 border-red-500 border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-2">Reminders</h2>
          <p className="text-muted-foreground">Send email reminders for overdue dues.</p>
        </Link>
      </div>
    </div>
  );
}