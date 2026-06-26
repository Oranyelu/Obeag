import Link from 'next/link';

export default function AdminDashboardPage() {
  const adminTools = [
    {
      href: "/admin/users",
      title: "User Management",
      desc: "View, approve pending members, and generate registration codes.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20.5a11.378 11.378 0 01-4.928-1.263l-.001-.109a3.375 3.375 0 016.75 0v.003m2.25-4.055zm-1.5-2.25a3.375 3.375 0 110-6.75 3.375 3.375 0 010 6.75zM22.5 12a3 3 0 11-6 0 3 3 0 016 0zM2.25 12a3 3 0 116 0 3 3 0 01-6 0z" />
        </svg>
      ),
      colorClass: "text-primary border-primary bg-primary/5"
    },
    {
      href: "/admin/payments",
      title: "Confirm Payments",
      desc: "Verify and approve manual bank transfers submitted by users.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
        </svg>
      ),
      colorClass: "text-emerald-600 border-emerald-600 dark:border-emerald-500 bg-emerald-500/5"
    },
    {
      href: "/admin/dues",
      title: "Manage Dues",
      desc: "Create, configure, and view association membership dues.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5M3.75 20.25z" />
        </svg>
      ),
      colorClass: "text-amber-600 border-amber-600 dark:border-amber-500 bg-amber-500/5"
    },
    {
      href: "/admin/meetings",
      title: "Manage Meetings",
      desc: "Schedule upcoming association meetings and log attendance/minutes.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
        </svg>
      ),
      colorClass: "text-sky-600 border-sky-600 dark:border-sky-500 bg-sky-500/5"
    },
    {
      href: "/admin/finances",
      title: "Financial Records",
      desc: "Track global finances, register group expenses, and audit balance sheets.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5M3.75 20.25z" />
        </svg>
      ),
      colorClass: "text-yellow-600 border-yellow-600 dark:border-yellow-500 bg-yellow-500/5"
    },
    {
      href: "/admin/broadcast",
      title: "Group Broadcasts",
      desc: "Draft and dispatch real-time dashboard notifications to all members.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      ),
      colorClass: "text-orange-600 border-orange-600 dark:border-orange-500 bg-orange-500/5"
    },
    {
      href: "/admin/reminders",
      title: "Reminders & Alerts",
      desc: "Send automated email reminders and alerts for overdue member payments.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      ),
      colorClass: "text-red-600 border-red-600 dark:border-red-500 bg-red-500/5"
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title block */}
      <div className="bg-card p-8 rounded-2xl border border-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-accent"></div>
        <h1 className="text-3xl font-extrabold text-gradient mb-2">Admin Control Center</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Manage OBEAG association operations, verify documents, confirm payments, audit financials, and broadcast notifications.
        </p>
      </div>
      
      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminTools.map((tool) => (
          <Link 
            key={tool.href} 
            href={tool.href} 
            className={`group block p-6 bg-card rounded-2xl border border-border hover:border-primary/40 hover:shadow-xl transition duration-300 relative overflow-hidden`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-xl border ${tool.colorClass} group-hover:scale-105 transition duration-300`}>
                {tool.icon}
              </div>
              <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition duration-200">{tool.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{tool.desc}</p>
            <div className="absolute bottom-3 right-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}