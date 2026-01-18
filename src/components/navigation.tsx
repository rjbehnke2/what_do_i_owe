"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Home, FileText, Settings, LogOut } from "lucide-react";

interface NavigationProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/logs", icon: FileText, label: "Logs" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-gray-200">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center h-16 px-4 border-b border-gray-200">
            <h1 className="text-lg font-bold text-gray-900">What Do I Owe?</h1>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex-shrink-0 p-4 border-t border-gray-200">
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-3 px-4 text-xs font-medium transition-colors ${
                  isActive ? "text-blue-600" : "text-gray-500"
                }`}
              >
                <item.icon className="w-6 h-6 mb-1" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex flex-col items-center py-3 px-4 text-xs font-medium text-gray-500"
          >
            <LogOut className="w-6 h-6 mb-1" />
            Sign Out
          </button>
        </div>
      </nav>
    </>
  );
}
