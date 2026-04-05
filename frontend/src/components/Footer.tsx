export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-muted text-muted-foreground">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-col items-center gap-2 text-center sm:gap-3">
          <div className="text-sm font-semibold text-foreground">
            Fresh Kitchen<sup>™</sup>
            <span className="ml-2 font-normal text-muted-foreground">
              Fresh Homemade Meals
            </span>
          </div>
          <p className="text-xs leading-relaxed">
            Fresh Kitchen<sup>™</sup> and the Fresh Kitchen logo are trademarks
            of Fresh Kitchen. All rights reserved. &copy; {year} Fresh Kitchen.
          </p>
        </div>
      </div>
    </footer>
  );
}
