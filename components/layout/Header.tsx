"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdHome, MdPerson, MdMenuBook, MdSettings } from "react-icons/md";

const PIXEL_FONT = "var(--font-vt323), 'VT323', monospace";

export default function Header() {
  const pathname = usePathname();
  const isActive = (path: string) =>
    path === "/agent/me" ? pathname.startsWith("/agent/") : pathname === path;

  const navLinks = [
    { href: "/", label: "ROOM", icon: MdHome },
    { href: "/guide", label: "GUIDE", icon: MdMenuBook },
    { href: "/agent/me", label: "AGENT", icon: MdPerson },
  ];

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#0d1b2a",
        borderBottom: "2px solid #4ecdc4",
      }}
    >
      <div style={{ padding: "0 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 52,
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: 18 }}></span>
            <span
              style={{
                fontFamily: PIXEL_FONT,
                fontSize: 22,
                color: "#4ecdc4",
                letterSpacing: "0.08em",
              }}
            >
              AI LIFE PATH: What Life Your Agent thinks You Have
            </span>
          </Link>

          {/* Nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    fontFamily: PIXEL_FONT,
                    fontSize: 16,
                    letterSpacing: "0.05em",
                    textDecoration: "none",
                    border: active
                      ? "2px solid #4ecdc4"
                      : "2px solid transparent",
                    background: active ? "#4ecdc4" : "transparent",
                    color: active ? "#0d1b2a" : "#4ecdc4",
                    transition: "all 0.1s",
                  }}
                >
                  <Icon style={{ width: 14, height: 14 }} />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              );
            })}
            <Link
              href="/?settings=1"
              title="Settings"
              style={{
                display: "flex",
                alignItems: "center",
                padding: "4px 8px",
                color: "#4ecdc4",
                border: "2px solid transparent",
                textDecoration: "none",
              }}
            >
              <MdSettings style={{ width: 16, height: 16 }} />
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
