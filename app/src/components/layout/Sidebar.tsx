"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Stats {
  documents: number;
  divisions: number;
  users: number;
  searches: number;
}

interface AdminStats {
  total_documents: number;
  total_pages: number;
  active_users: number;
  searches_today: number;
  searches_this_week: number;
  uploads_today: number;
  uploads_this_week: number;
  total_uploads: number;
  indexer_online: boolean;
  milvus_connected: boolean;
  db_connected: boolean;
}

const navigationItems = [
  {
    label: "Recherche",
    href: "/",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    ),
  },
  {
    label: "Historique",
    href: "/history",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    label: "Favoris",
    href: "/favorites",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    ),
  },
];

const adminItems = [
  {
    label: "Tableau de bord",
    href: "/admin",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    ),
  },
  {
    label: "Indexation",
    href: "/admin/indexing",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
      />
    ),
  },
  {
    label: "Utilisateurs",
    href: "/admin/users",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    ),
  },
  {
    label: "Divisions",
    href: "/admin/divisions",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    ),
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats>({ documents: 0, divisions: 6, users: 0, searches: 0 });
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  
  // Debug: Log user info
  useEffect(() => {
    console.log("Sidebar - User:", user, "Role:", user?.role, "isLoading:", authLoading);
  }, [user, authLoading]);
  
  const isAdmin = user?.role === "ADMIN" || user?.role === "CENADI_DIRECTOR";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch admin stats if user is admin
  useEffect(() => {
    if (authLoading || !isAdmin) return;

    const fetchAdminStats = async () => {
      try {
        const response = await fetch("/api/admin/stats", {
          credentials: "include"
        });
        if (response.ok) {
          const data = await response.json();
          setAdminStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch admin stats:", error);
      }
    };

    fetchAdminStats();
    const interval = setInterval(fetchAdminStats, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, authLoading]);

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
  };

  const NavLink = ({
    href,
    icon,
    label
  }: {
    href: string;
    icon: React.ReactNode;
    label: string;
  }) => {
    const isActive = pathname === href;

    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive ? "bg-primary-700 text-white shadow-md" : "text-cream-700 hover:bg-primary-100 hover:text-primary-800"}`}
      >
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {icon}
        </svg>
        <span className="font-medium">{label}</span>
        {isActive && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white"></span>
        )}
      </Link>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-primary-900/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-cream-300 transform transition-transform duration-300 ease-in-out z-30 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-300 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-4 space-y-6">
          <nav>
            <p className="px-4 text-xs font-semibold text-primary-600 uppercase tracking-wider mb-3">
              Navigation
            </p>
            <div className="space-y-1">
              {navigationItems.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </div>
          </nav>

          <div className="h-px bg-cream-300" />

          {!authLoading && isAdmin && (
            <>
              <nav>
                <p className="px-4 text-xs font-semibold text-primary-600 uppercase tracking-wider mb-3">
                  Administration
                </p>
                <div className="space-y-1">
                  {adminItems.map((item) => (
                    <NavLink key={item.href} {...item} />
                  ))}
                </div>
                
                {/* Admin Dashboard Stats - Always Visible for Admins */}
                {adminStats && (
                  <div className="mt-4 bg-primary-50 rounded-xl p-4 space-y-4">
                    {/* System Status */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-primary-600 uppercase">Etat Systeme</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className={`flex items-center justify-center p-2 rounded-lg ${adminStats.indexer_online ? "bg-green-100" : "bg-red-100"}`}>
                          <div className={`w-2 h-2 rounded-full mr-1 ${adminStats.indexer_online ? "bg-green-500" : "bg-red-500"}`} />
                          <span className={`text-xs ${adminStats.indexer_online ? "text-green-700" : "text-red-700"}`}>Indexer</span>
                        </div>
                        <div className={`flex items-center justify-center p-2 rounded-lg ${adminStats.milvus_connected ? "bg-green-100" : "bg-red-100"}`}>
                          <div className={`w-2 h-2 rounded-full mr-1 ${adminStats.milvus_connected ? "bg-green-500" : "bg-red-500"}`} />
                          <span className={`text-xs ${adminStats.milvus_connected ? "text-green-700" : "text-red-700"}`}>Milvus</span>
                        </div>
                        <div className={`flex items-center justify-center p-2 rounded-lg ${adminStats.db_connected ? "bg-green-100" : "bg-red-100"}`}>
                          <div className={`w-2 h-2 rounded-full mr-1 ${adminStats.db_connected ? "bg-green-500" : "bg-red-500"}`} />
                          <span className={`text-xs ${adminStats.db_connected ? "text-green-700" : "text-red-700"}`}>DB</span>
                        </div>
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-primary-600 uppercase">Documents</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white rounded-lg p-2 text-center">
                          <p className="text-lg font-bold text-primary-800">{formatNumber(adminStats.total_documents)}</p>
                          <p className="text-xs text-primary-400">Fichiers</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 text-center">
                          <p className="text-lg font-bold text-primary-800">{formatNumber(adminStats.total_pages)}</p>
                          <p className="text-xs text-primary-400">Pages</p>
                        </div>
                      </div>
                    </div>

                    {/* Activity */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-primary-600 uppercase">Activite</p>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                          <span className="text-xs text-primary-600">Recherches aujourd hui</span>
                          <span className="font-bold text-primary-800">{adminStats.searches_today}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                          <span className="text-xs text-primary-600">Uploads aujourd hui</span>
                          <span className="font-bold text-primary-800">{adminStats.uploads_today}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                          <span className="text-xs text-primary-600">Utilisateurs actifs</span>
                          <span className="font-bold text-primary-800">{adminStats.active_users}</span>
                        </div>
                      </div>
                    </div>

                    <Link href="/admin" className="block w-full text-center py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">
                      Voir details complets
                    </Link>
                  </div>
                )}
              </nav>
              <div className="h-px bg-cream-300" />
            </>
          )}

          <div className="px-4">
            <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-3">
              Statistiques
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary-700">{formatNumber(stats.documents)}</p>
                <p className="text-xs text-primary-500">Documents</p>
              </div>
              <div className="bg-primary-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary-700">{stats.divisions}</p>
                <p className="text-xs text-primary-500">Divisions</p>
              </div>
            </div>
          </div>

          <div className="px-4 pt-4 border-t border-cream-300">
            <p className="text-xs text-cream-500">
              Version 1.0.0 - Milvus Search
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}