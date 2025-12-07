"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", icon: "🏠" },
  { href: "/planning", icon: "📅" },
  { href: "/presence", icon: "📝" },
  { href: "/demandes", icon: "📨" },
  { href: "/depenses", icon: "💶" },
  { href: "/reservations", icon: "🍽️" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="cb-bottom-nav">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "cb-bottom-nav__item" +
              (isActive ? " cb-bottom-nav__item--active" : "")
            }
          >
            <span>{item.icon}</span>
            {isActive && <span className="cb-bottom-nav__dot" />}
          </Link>
        );
      })}
    </nav>
  );
}