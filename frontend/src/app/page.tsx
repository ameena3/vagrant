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
import { ThemeToggle } from "@/components/ThemeToggle";
import { HoneycombBackdrop } from "@/components/HoneycombBackdrop";
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
  const [cartBump, setCartBump] = useState(false);

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
    setCartBump(true);
    setTimeout(() => setCartBump(false), 450);
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
    <div className="flex h-screen flex-col bg-background">
      {/* Navigation Bar */}
      <nav className="border-b border-border bg-background/95 backdrop-blur shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="relative rounded-lg bg-green-100 dark:bg-green-900/40 p-2">
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-lg border-2 border-dashed border-green-400/40 dark:border-green-500/40 animate-spin-slow"
              />
              <Leaf className="relative h-5 w-5 text-green-600 dark:text-green-400 animate-bob" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground">
                Fresh Kitchen<sup className="ml-0.5 text-xs font-medium text-muted-foreground">™</sup>
              </span>
              <span className="text-xs text-muted-foreground">Fresh Homemade Meals</span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {session ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-foreground">
                    {session.user?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                </div>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="hidden sm:flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 dark:text-green-300 dark:hover:text-green-100 dark:bg-green-900/40 dark:hover:bg-green-900/60 px-2 py-1 rounded-md transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setChangePwOpen(true)}
                  title="Change Password"
                  className="hover:bg-accent"
                >
                  <KeyRound className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  title="Sign Out"
                  className="hover:bg-red-100 dark:hover:bg-red-900/40"
                >
                  <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
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
                  className="relative border-orange-200 hover:bg-orange-50 dark:border-orange-900/50 dark:hover:bg-orange-900/30"
                >
                  <ShoppingCart className={`h-5 w-5 text-orange-600 dark:text-orange-400${cartBump ? " animate-cart-pop" : ""}`} />
                  {cartItems.length > 0 && (
                    <span className="absolute -right-2 -top-2 h-5 w-5">
                      <span className="absolute inset-0 rounded-full bg-orange-400 animate-pulse-ring" />
                      <Badge className="relative h-5 w-5 rounded-full p-0 flex items-center justify-center bg-orange-500 text-white text-xs">
                        {cartItems.length}
                      </Badge>
                    </span>
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
        <div className="relative overflow-hidden bg-gradient-to-r from-green-50 via-emerald-50 to-orange-50 dark:from-green-950 dark:via-emerald-950 dark:to-orange-950 bg-[length:200%_200%] animate-gradient-shift px-4 py-8 sm:px-6 sm:py-12">
          {/* Decorative floating blobs */}
          <div
            className="blob animate-float-slow bg-green-300 h-64 w-64 -top-16 -left-16"
            aria-hidden="true"
          />
          <div
            className="blob animate-float bg-orange-300 h-56 w-56 -bottom-20 -right-10"
            style={{ animationDelay: "1.5s" }}
            aria-hidden="true"
          />
          <div
            className="blob animate-float-slow bg-amber-200 h-48 w-48 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ animationDelay: "3s" }}
            aria-hidden="true"
          />
          <div
            className="blob animate-drift bg-rose-300 dark:bg-rose-500 h-40 w-40 top-10 right-1/3"
            style={{ animationDelay: "2s" }}
            aria-hidden="true"
          />
          <div
            className="blob animate-drift bg-emerald-300 dark:bg-emerald-500 h-52 w-52 bottom-0 left-1/4"
            style={{ animationDelay: "4s" }}
            aria-hidden="true"
          />

          {/* Honeycomb cluster (right) */}
          <HoneycombBackdrop
            className="hidden md:block top-2 -right-10 opacity-60 dark:opacity-50"
            rows={4}
            cols={5}
            cellSize={80}
          />
          {/* Honeycomb cluster (left, smaller, mirrored) */}
          <HoneycombBackdrop
            className="hidden lg:block bottom-2 -left-12 opacity-40 dark:opacity-35 rotate-180"
            rows={3}
            cols={4}
            cellSize={64}
          />

          {/* Rising food-emoji particles */}
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            {[
              { emoji: "🥗", left: "8%", delay: "0s", dur: "11s", size: "text-2xl" },
              { emoji: "🍅", left: "18%", delay: "2.4s", dur: "13s", size: "text-xl" },
              { emoji: "🥕", left: "30%", delay: "1.2s", dur: "12s", size: "text-2xl" },
              { emoji: "🌿", left: "44%", delay: "5.5s", dur: "14s", size: "text-xl" },
              { emoji: "🍋", left: "58%", delay: "3.7s", dur: "11s", size: "text-2xl" },
              { emoji: "🥑", left: "72%", delay: "0.8s", dur: "13s", size: "text-xl" },
              { emoji: "🍞", left: "84%", delay: "4.2s", dur: "12s", size: "text-2xl" },
              { emoji: "🫐", left: "92%", delay: "6.5s", dur: "14s", size: "text-xl" },
            ].map((p, i) => (
              <span
                key={i}
                className={`rise-particle animate-rise ${p.size}`}
                style={{
                  left: p.left,
                  animationDelay: p.delay,
                  animationDuration: p.dur,
                }}
              >
                {p.emoji}
              </span>
            ))}
          </div>

          <div className="relative z-10 mx-auto max-w-4xl space-y-4 text-center">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
              Fresh Homemade Meals,{" "}
              <span className="text-green-600 dark:text-green-400">Made with Love</span>
            </h1>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Fresh Kitchen<sup>™</sup>
            </p>
            <p className="text-lg text-muted-foreground sm:text-xl">
              Order nutritious, delicious meals prepared fresh for your week.
              Choose your favorite meals and enjoy them fresh.
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-200 dark:border-green-800 animate-sway">
                🥗 Fresh Ingredients
              </Badge>
              <Badge
                className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-800 animate-sway"
                style={{ animationDelay: "1s" }}
              >
                👨‍🍳 Homemade Quality
              </Badge>
              <Badge
                className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800 animate-sway"
                style={{ animationDelay: "2s" }}
              >
                🌿 Locally Sourced
              </Badge>
            </div>
          </div>
        </div>

        {/* Animated ingredients ticker */}
        <div className="relative overflow-hidden border-y border-border bg-muted/40 py-2">
          <div className="flex whitespace-nowrap animate-ticker">
            {Array.from({ length: 2 }).map((_, r) => (
              <div key={r} className="flex items-center gap-8 px-4 text-sm text-muted-foreground">
                <span>🥗 Crisp Greens</span>
                <span>🍅 Vine Tomatoes</span>
                <span>🥑 Ripe Avocado</span>
                <span>🌿 Fresh Herbs</span>
                <span>🍋 Zesty Citrus</span>
                <span>🥕 Garden Carrots</span>
                <span>🍞 Baked Daily</span>
                <span>🫐 Seasonal Berries</span>
                <span>🧀 Artisan Cheese</span>
              </div>
            ))}
          </div>
        </div>

        {/* Week View */}
        <div className="border-b border-border">
          <WeekView
            weekStart={weekStart}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onNavigateWeek={navigateWeek}
            schedule={schedule}
          />
        </div>

        {/* Selected Day Header */}
        <div className="border-b border-border bg-muted/50 px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold text-foreground">
              {DAY_NAMES[selectedDay]}'s Menu
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            {isDayBlocked && (
              <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                ⚠️ This day is currently blocked. No orders available.
              </p>
            )}
            {weekendDisabled && (
              <p className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
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
        <div className="sticky bottom-0 left-0 right-0 border-t border-border bg-background p-4 sm:hidden">
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
