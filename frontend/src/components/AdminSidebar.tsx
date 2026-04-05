"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  UtensilsCrossed,
  CalendarDays,
  BookOpen,
  Megaphone,
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Menu Manager", href: "/admin/menu", icon: UtensilsCrossed },
    { label: "Bookings", href: "/admin/bookings", icon: CalendarDays },
    { label: "Schedule", href: "/admin/schedule", icon: BookOpen },
    { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
    { label: "Admin Users", href: "/admin/users", icon: Users },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      <aside
        className={cn(
          "w-64 bg-slate-900 text-white dark:bg-card dark:text-card-foreground dark:border-r dark:border-border flex flex-col fixed h-screen lg:relative lg:translate-x-0 transition-transform duration-300 z-40",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-slate-700 dark:border-border">
          <h1 className="text-2xl font-bold">Fresh Kitchen</h1>
          <p className="text-sm text-slate-400 dark:text-muted-foreground mt-1">Admin Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 text-base",
                    active
                      ? "bg-blue-600 hover:bg-blue-700 text-white dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground"
                      : "text-slate-300 hover:bg-slate-800 dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700 dark:border-border space-y-2">
          <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-800 dark:hover:bg-accent transition-colors">
            <span className="text-sm text-slate-300 dark:text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-slate-300 hover:bg-slate-800 dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-accent-foreground text-base"
            onClick={() => signOut()}
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
