"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface HeaderProps {
  onMenuToggle: () => void;
  sidebarOpen: boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  division: string | null;
}

export function Header({ onMenuToggle, sidebarOpen }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };
    fetchUser();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getUserInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  };

  const getUserDisplayName = () => {
    if (user?.name) return user.name;
    if (user?.email) return user.email.split("@")[0];
    return "Utilisateur";
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case "ADMIN": return "Administrateur";
      case "CENADI_DIRECTOR": return "Directeur";
      case "DIVISION_HEAD": return "Chef de Division";
      case "MANAGER": return "Manager";
      default: return "Utilisateur";
    }
  };

  const getDivisionLabel = () => {
    return user?.division || "";
  };

  return (
    <header className="sticky top-0 z-40 bg-primary-800 text-cream-100 shadow-lg">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Menu Toggle */}
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg hover:bg-primary-700 transition-colors"
            aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Logo & Title */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-600 flex items-center justify-center">
              <span className="text-xl font-bold text-cream-100">C</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-heading font-bold leading-tight">CENADI</h1>
              <p className="text-xs text-cream-300 leading-tight">Recherche Documentaire</p>
            </div>
          </Link>
        </div>

        {/* Center Section - Breadcrumb */}
        <nav className="hidden md:flex items-center text-sm text-cream-300">
          <Link href="/" className="hover:text-cream-100 transition-colors">Accueil</Link>
          {pathname !== "/" && (
            <>
              <svg className="w-4 h-4 mx-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd" />
              </svg>
              <span className="text-cream-100">
                {pathname === "/admin" && "Administration"}
                {pathname === "/history" && "Historique"}
                {pathname === "/favorites" && "Favoris"}
                {pathname.startsWith("/admin/users") && "Utilisateurs"}
                {pathname.startsWith("/admin/indexing") && "Indexation"}
                {pathname.startsWith("/document") && "Document"}
              </span>
            </>
          )}
        </nav>

        {/* Right Section - User Menu */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="p-2 rounded-lg hover:bg-primary-700 transition-colors relative"
            aria-label="Notifications">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent-500 rounded-full"></span>
          </button>

          {/* User Avatar with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-3 pl-3 border-l border-primary-600">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium leading-tight">{getUserDisplayName()}</p>
                <p className="text-xs text-cream-400 leading-tight">
                  {getDivisionLabel() && <span className="mr-1">{getDivisionLabel()} •</span>}
                  {getRoleLabel()}
                </p>
              </div>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="relative w-9 h-9 rounded-full bg-gradient-to-br from-accent-500 to-accent-700
                          flex items-center justify-center text-cream-100 font-semibold
                          ring-2 ring-primary-600 hover:ring-accent-400 transition-all"
              >
                {getUserInitial()}
                {getDivisionLabel() && (
                  <span className="absolute -bottom-1 -right-1 px-1 py-0.5 text-[9px] font-bold
                                  bg-primary-900 text-cream-100 rounded-sm border border-primary-600">
                    {getDivisionLabel()}
                  </span>
                )}
              </button>
            </div>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl
                            border border-cream-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-cream-100">
                  <p className="text-sm font-semibold text-primary-800">{getUserDisplayName()}</p>
                  <p className="text-xs text-primary-500">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getDivisionLabel() && (
                      <span className="px-2 py-0.5 text-xs font-medium
                                      bg-accent-100 text-accent-700 rounded-full">
                        {getDivisionLabel()}
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-xs font-medium
                                    bg-primary-100 text-primary-700 rounded-full">
                      {getRoleLabel()}
                    </span>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <Link href="/profile"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-primary-700
                              hover:bg-cream-50 transition-colors"
                    onClick={() => setDropdownOpen(false)}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Mon profil
                  </Link>

                  <Link href="/favorites"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-primary-700
                              hover:bg-cream-50 transition-colors"
                    onClick={() => setDropdownOpen(false)}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    Favoris
                  </Link>

                  <Link href="/history"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-primary-700
                              hover:bg-cream-50 transition-colors"
                    onClick={() => setDropdownOpen(false)}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Historique
                  </Link>
                </div>

                {/* Logout */}
                <div className="pt-1 border-t border-cream-100">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600
                              hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
