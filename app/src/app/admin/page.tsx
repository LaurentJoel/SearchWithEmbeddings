"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  division: string | null;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
    division: string | null;
  };
}

interface DivisionStat {
  division: string;
  count: number;
}

interface SystemStats {
  total_documents: number;
  total_pages: number;
  divisions: number;
  searches_today: number;
  searches_this_week: number;
  active_users: number;
  users_per_division: DivisionStat[];
  uploads_today: number;
  uploads_this_week: number;
  total_uploads: number;
  uploads_per_division: DivisionStat[];
  index_status: "idle" | "indexing" | "error";
  indexer_online: boolean;
  milvus_connected: boolean;
  db_connected: boolean;
  file_watcher_active: boolean;
  recent_searches: Array<{ query: string; time: string }>;
  last_updated: string;
}

const DIVISION_LABELS: Record<string, string> = {
  DEP: "Etudes et Projets",
  DEL: "Exploitation et Logistique",
  DTB: "Technique et BD",
  DIRE: "Direction",
  DAAF: "Admin. et Financiere",
  GENERAL: "General",
};

export default function AdminPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Check if user is admin
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          router.push("/login");
          return;
        }
        const data = await response.json();
        if (data.user?.role !== "ADMIN" && data.user?.role !== "CENADI_DIRECTOR") {
          router.push("/"); // Redirect non-admins to home
          return;
        }
        setCurrentUser(data.user);
      } catch (error) {
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  // Fetch stats and activities
  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      try {
        const [statsRes, activitiesRes] = await Promise.all([
          fetch("/api/admin/stats", { cache: "no-store" }),
          fetch("/api/admin/activities?limit=10", { cache: "no-store" }),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (activitiesRes.ok) {
          const data = await activitiesRes.json();
          setActivities(data.activities || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchData, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [autoRefresh, currentUser]);

  const triggerReindex = async () => {
    setIsIndexing(true);
    try {
      await fetch("/api/admin/reindex", { method: "POST" });
    } catch (error) {
      console.error("Reindex failed:", error);
    } finally {
      setIsIndexing(false);
    }
  };

  const handleExportActivities = () => {
    window.location.href = "/api/admin/activities/export?format=csv";
  };

  const StatCard = ({ title, value, subtitle, icon, loading: cardLoading, color = "primary" }: {
    title: string; value: string | number; subtitle?: string; icon: React.ReactNode; loading?: boolean; color?: string;
  }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-cream-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-primary-500 mb-1">{title}</p>
          {cardLoading ? (
            <div className="h-9 w-20 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <>
              <p className="text-3xl font-bold text-primary-800">{value}</p>
              {subtitle && <p className="text-xs text-primary-400 mt-1">{subtitle}</p>}
            </>
          )}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-lg text-${color}-600`}>{icon}</div>
      </div>
    </div>
  );

  const StatusIndicator = ({ connected, label }: { connected: boolean; label: string }) => (
    <div className={`flex items-center justify-between p-3 rounded-lg ${connected ? "bg-green-50" : "bg-red-50"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
        <span className={`font-medium ${connected ? "text-green-800" : "text-red-800"}`}>{label}</span>
      </div>
      <span className={`text-sm ${connected ? "text-green-600" : "text-red-600"}`}>
        {connected ? "Connecte" : "Deconnecte"}
      </span>
    </div>
  );

  const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "A l instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return date.toLocaleDateString("fr-FR");
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "LOGIN": return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      );
      case "LOGOUT": return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      );
      case "SEARCH": return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
      case "VIEW": case "DOCUMENT_VIEW": return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      );
      case "UPLOAD": case "DOCUMENT_UPLOAD": return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      );
      case "USER_CREATE": return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      );
      default: return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className={`flex-1 transition-all duration-300 overflow-y-auto ${sidebarOpen ? "ml-64" : "ml-0"}`}>
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-heading font-bold text-primary-800">Tableau de bord Administrateur</h1>
                <p className="text-primary-500 mt-1">Vue d ensemble du systeme de recherche documentaire CENADI</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-primary-400">
                  Derniere MAJ: {stats?.last_updated ? new Date(stats.last_updated).toLocaleTimeString("fr-FR") : "-"}
                </span>
                <button onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-1 text-sm rounded-lg ${autoRefresh ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
                </button>
              </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="Documents indexes" value={stats?.total_documents || 0} loading={loading}
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
              <StatCard title="Pages totales" value={stats?.total_pages || 0} loading={loading}
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} />
              <StatCard title="Utilisateurs actifs" value={stats?.active_users || 0} loading={loading}
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
              <StatCard title="Divisions" value={stats?.divisions || 5} loading={loading}
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} />
            </div>

            {/* Search & Upload Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="Recherches aujourd hui" value={stats?.searches_today || 0} 
                subtitle={`${stats?.searches_this_week || 0} cette semaine`} loading={loading}
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>} />
              <StatCard title="Uploads aujourd hui" value={stats?.uploads_today || 0}
                subtitle={`${stats?.uploads_this_week || 0} cette semaine`} loading={loading}
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>} />
              <StatCard title="Total uploads" value={stats?.total_uploads || 0} loading={loading}
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>} />
              <StatCard title="Recherches semaine" value={stats?.searches_this_week || 0} loading={loading}
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
            </div>

            {/* Division Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Users per Division */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-cream-200">
                <h2 className="text-lg font-semibold text-primary-800 mb-4">Utilisateurs par division</h2>
                {loading ? (
                  <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 animate-pulse rounded"></div>)}</div>
                ) : (
                  <div className="space-y-3">
                    {(stats?.users_per_division || []).map((item) => (
                      <div key={item.division} className="flex items-center justify-between p-3 bg-cream-50 rounded-lg">
                        <span className="font-medium text-primary-700">{DIVISION_LABELS[item.division] || item.division}</span>
                        <span className="text-lg font-bold text-primary-800">{item.count}</span>
                      </div>
                    ))}
                    {(!stats?.users_per_division || stats.users_per_division.length === 0) && (
                      <p className="text-center text-primary-400 py-4">Aucune donnee</p>
                    )}
                  </div>
                )}
              </div>

              {/* Uploads per Division */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-cream-200">
                <h2 className="text-lg font-semibold text-primary-800 mb-4">Uploads par division</h2>
                {loading ? (
                  <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 animate-pulse rounded"></div>)}</div>
                ) : (
                  <div className="space-y-3">
                    {(stats?.uploads_per_division || []).map((item) => (
                      <div key={item.division} className="flex items-center justify-between p-3 bg-cream-50 rounded-lg">
                        <span className="font-medium text-primary-700">{DIVISION_LABELS[item.division] || item.division}</span>
                        <span className="text-lg font-bold text-primary-800">{item.count}</span>
                      </div>
                    ))}
                    {(!stats?.uploads_per_division || stats.uploads_per_division.length === 0) && (
                      <p className="text-center text-primary-400 py-4">Aucun upload enregistre</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-cream-200 mb-8">
              <h2 className="text-lg font-semibold text-primary-800 mb-4">Actions rapides</h2>
              <div className="flex flex-wrap gap-4">
                <button onClick={triggerReindex} disabled={isIndexing} className="btn btn-primary flex items-center gap-2">
                  {isIndexing ? "Indexation..." : "Reindexer les documents"}
                </button>
                <a href="/admin/indexing" className="btn btn-secondary">Ajouter des documents</a>
                <a href="/admin/users" className="btn btn-ghost">Gerer les utilisateurs</a>
                <a href="/admin/divisions" className="btn btn-ghost">Gerer les divisions</a>
              </div>
            </div>

            {/* System Status & Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Status */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-cream-200">
                <h2 className="text-lg font-semibold text-primary-800 mb-4">Etat du systeme</h2>
                <div className="space-y-4">
                  <StatusIndicator connected={stats?.milvus_connected || false} label="Milvus (Vecteurs)" />
                  <StatusIndicator connected={stats?.indexer_online || false} label="Service Indexer" />
                  <StatusIndicator connected={stats?.db_connected || false} label="PostgreSQL" />
                  <StatusIndicator connected={stats?.file_watcher_active || false} label="File Watcher" />
                </div>
              </div>

              {/* Recent Activities */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-cream-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-primary-800">Activites recentes</h2>
                  <button onClick={handleExportActivities} className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Exporter CSV
                  </button>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg"></div>
                      ))}
                    </div>
                  ) : activities.length > 0 ? (
                    activities.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between py-2 border-b border-cream-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getActivityIcon(activity.type)}</span>
                          <div>
                            <p className="text-sm font-medium text-primary-700">{activity.user.name || activity.user.email}</p>
                            <p className="text-xs text-primary-400">{activity.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-primary-400">{formatTimeAgo(activity.createdAt)}</span>
                          {activity.user.division && (
                            <p className="text-xs text-primary-300">{activity.user.division}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-primary-400 py-4">Aucune activite recente</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Searches */}
            {stats?.recent_searches && stats.recent_searches.length > 0 && (
              <div className="mt-6 bg-white rounded-xl p-6 shadow-sm border border-cream-200">
                <h2 className="text-lg font-semibold text-primary-800 mb-4">Recherches recentes</h2>
                <div className="flex flex-wrap gap-2">
                  {stats.recent_searches.map((search, idx) => (
                    <span key={idx} className="px-3 py-1 bg-cream-100 text-primary-700 rounded-full text-sm">
                      {search.query}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
