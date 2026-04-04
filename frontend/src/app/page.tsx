"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { ShoppingCart, Leaf, LogIn, LogOut, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { WeekView } from "@/components/WeekView";
import { DayMenu } from "@/components/DayMenu";
import { OrderSummary } from "@/components/OrderSummary";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { getWeekStart, getWeekDates, DAY_NAMES, localDateStr } from "@/lib/utils";
import { api } from "@/lib/api";
import type {
  DayMenu as DayMenuType,
  OrderItem,
  Announcement,
  WeekSchedule,
} from "@/types";
import Link from "next/link";

export default function HomePage() {
  const { data: session } = useSession();
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [menus, setMenus] = useState<DayMenuType[]>([]);
  const [schedule, setSchedule] = useState<WeekSchedule | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidePrices, setHidePrices] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [changePwCurrent, setChangePwCurrent] = useState("");
  const [changePwNew, setChangePwNew] = useState("");
  const [changePwConfirm, setChangePwConfirm] = useState("");
  const [changePwError, setChangePwError] = useState("");
  const [changePwLoading, setChangePwLoading] = useState(false);

  useEffect(() => {
    if (session) {
      api.getProfile()
        .then((user) => setIsAdmin(user.role === "admin"))
        .catch(() => setIsAdmin(false));
    } else {
      setIsAdmin(false);
    }
  }, [session]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangePwError("");
    if (changePwNew !== changePwConfirm) {
      setChangePwError("New passwords do not match");
      return;
    }
    setChangePwLoading(true);
    try {
      await api.changePassword(changePwCurrent, changePwNew);
      setChangePwOpen(false);
      setChangePwCurrent("");
      setChangePwNew("");
      setChangePwConfirm("");
    } catch (err: any) {
      setChangePwError(err.message || "Failed to change password");
    }
    setChangePwLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const result = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      redirect: false,
    });
    setLoginLoading(false);
    if (result?.ok) {
      setLoginOpen(false);
      setLoginEmail("");
      setLoginPassword("");
    } else {
      setLoginError("Invalid email or password");
    }
  }

  useEffect(() => {
    loadData();
  }, [weekStart]);

  async function loadData() {
    setLoading(true);
    try {
      const [menuData, scheduleData, annData, settingsData] = await Promise.all([
        api.getWeekMenus(weekStart),
        api.getSchedule(weekStart),
        api.getAnnouncements(),
        api.getPublicSettings(),
      ]);
      setMenus(menuData || []);
      setSchedule(scheduleData);
      setAnnouncements(annData || []);
      setHidePrices(settingsData?.hide_prices ?? false);
    } catch (err) {
      console.error("Failed to load data:", err);
    }
    setLoading(false);
  }

  function navigateWeek(direction: number) {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + direction * 7);
    setWeekStart(localDateStr(d));
  }

  function addToCart(item: OrderItem) {
    setCartItems((prev) => [...prev, item]);
  }

  function removeFromCart(index: number) {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCartItemComment(index: number, comment: string) {
    setCartItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, comment } : item))
    );
  }

  async function handleCheckout() {
    if (cartItems.length === 0) return;

    if (!session?.user?.email || !session?.user?.name) {
      signIn();
      return;
    }

    // Create order
    const order = await api.createOrder({
      items: cartItems,
      week_start: weekStart,
    });

    if (order) {
      // Redirect to order page
      window.location.href = `/order?orderId=${order.id}`;
    }
  }

  const selectedMenu = menus.find((m) => m.day_of_week === selectedDay);
  const selectedDate = getWeekDates(weekStart)[selectedDay];
  const isDayBlocked = schedule?.days?.find(
    (d) => d.day_of_week === selectedDay
  )?.blocked;
  const isWeekend = selectedDay === 0 || selectedDay === 6;
  const weekendDisabled = isWeekend && !schedule?.weekends_enabled;

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Navigation Bar */}
      <nav className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-green-100 p-2">
              <Leaf className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-900">
                Fresh Kitchen
              </span>
              <span className="text-xs text-slate-600">Fresh Homemade Meals</span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {session ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-slate-900">
                    {session.user?.name}
                  </p>
                  <p className="text-xs text-slate-600">{session.user?.email}</p>
                </div>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="hidden sm:flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-md transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setChangePwOpen(true)}
                  title="Change Password"
                  className="hover:bg-slate-100"
                >
                  <KeyRound className="h-5 w-5 text-slate-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  title="Sign Out"
                  className="hover:bg-red-100"
                >
                  <LogOut className="h-5 w-5 text-red-600" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLoginOpen(true)}
                className="gap-2"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            )}

            {/* Cart Button */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative border-orange-200 hover:bg-orange-50"
                >
                  <ShoppingCart className="h-5 w-5 text-orange-600" />
                  {cartItems.length > 0 && (
                    <Badge className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-orange-500 text-white text-xs">
                      {cartItems.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Shopping Cart</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <OrderSummary
                    items={cartItems}
                    onRemoveItem={removeFromCart}
                    onUpdateComment={updateCartItemComment}
                    onCheckout={handleCheckout}
                    loading={loading}
                    hidePrices={hidePrices}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Announcements */}
        {announcements.length > 0 && (
          <AnnouncementBanner announcements={announcements} />
        )}

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-orange-50 px-4 py-8 sm:px-6 sm:py-12">
          <div className="mx-auto max-w-4xl space-y-4 text-center">
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl md:text-5xl">
              Fresh Homemade Meals,{" "}
              <span className="text-green-600">Made with Love</span>
            </h1>
            <p className="text-lg text-slate-600 sm:text-xl">
              Order nutritious, delicious meals prepared fresh for your week.
              Choose your favorite meals and enjoy them fresh.
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              <Badge className="bg-green-100 text-green-700 border-green-200">
                🥗 Fresh Ingredients
              </Badge>
              <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                👨‍🍳 Homemade Quality
              </Badge>
            </div>
          </div>
        </div>

        {/* Week View */}
        <div className="border-b border-slate-200">
          <WeekView
            weekStart={weekStart}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onNavigateWeek={navigateWeek}
            schedule={schedule}
          />
        </div>

        {/* Selected Day Header */}
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold text-slate-900">
              {DAY_NAMES[selectedDay]}'s Menu
            </h2>
            <p className="text-sm text-slate-600">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            {isDayBlocked && (
              <p className="mt-2 text-sm font-medium text-red-600">
                ⚠️ This day is currently blocked. No orders available.
              </p>
            )}
            {weekendDisabled && (
              <p className="mt-2 text-sm font-medium text-amber-600">
                ℹ️ Weekends are not available for ordering.
              </p>
            )}
          </div>
        </div>

        {/* Day Menu */}
        <div className="mx-auto max-w-6xl">
          <DayMenu
            menu={selectedMenu}
            loading={loading}
            onAddToCart={addToCart}
            date={localDateStr(selectedDate)}
            hidePrices={hidePrices}
          />
        </div>
      </div>

      {/* Mobile Floating Cart Button */}
      {cartItems.length > 0 && (
        <div className="sticky bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4 sm:hidden">
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 h-auto text-base gap-2">
                <ShoppingCart className="h-5 w-5" />
                View Cart ({cartItems.length}) - View Order
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full">
              <SheetHeader>
                <SheetTitle>Shopping Cart</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <OrderSummary
                  items={cartItems}
                  onRemoveItem={removeFromCart}
                  onUpdateComment={updateCartItemComment}
                  onCheckout={handleCheckout}
                  loading={loading}
                  hidePrices={hidePrices}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Change Password Modal */}
      <Dialog open={changePwOpen} onOpenChange={(open) => { setChangePwOpen(open); if (!open) setChangePwError(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="cp-current">Current Password</Label>
              <Input
                id="cp-current"
                type="password"
                placeholder="••••••••"
                value={changePwCurrent}
                onChange={(e) => setChangePwCurrent(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-new">New Password</Label>
              <Input
                id="cp-new"
                type="password"
                placeholder="••••••••"
                value={changePwNew}
                onChange={(e) => setChangePwNew(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-confirm">Confirm New Password</Label>
              <Input
                id="cp-confirm"
                type="password"
                placeholder="••••••••"
                value={changePwConfirm}
                onChange={(e) => setChangePwConfirm(e.target.value)}
                required
              />
            </div>
            {changePwError && (
              <p className="text-sm text-red-600">{changePwError}</p>
            )}
            <Button type="submit" className="w-full" disabled={changePwLoading}>
              {changePwLoading ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Login Modal */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign In</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            {loginError && (
              <p className="text-sm text-red-600">{loginError}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loginLoading}
            >
              {loginLoading ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
