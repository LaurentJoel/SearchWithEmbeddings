"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  division: string;
  createdAt: string;
}

interface UserStats {
  totalSearches: number;
  totalUploads: number;
  totalDocumentsViewed: number;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  CENADI_DIRECTOR: "Directeur CENADI",
  DIVISION_HEAD: "Chef de Division",
  USER: "Utilisateur",
};

const DIVISION_LABELS: Record<string, string> = {
  DEP: "Division des Etudes et Projets",
  DEL: "Division de l Exploitation et Logistique",
  DTB: "Division Technique et Base de donnees",
  DIRE: "Direction",
  DAAF: "Division Administrative et Financiere",
};

export default function ProfilePage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          if (response.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch profile");
        }
        const data = await response.json();
        setUser(data.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    async function fetchStats() {
      try {
        const response = await fetch("/api/user/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    }

    fetchProfile();
    fetchStats();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-cream-200 max-w-md w-full">
          <h2 className="text-xl font-bold text-red-600 mb-2">Erreur</h2>
          <p className="text-primary-500 mb-4">{error || "Impossible de charger le profil"}</p>
          <button onClick={() => router.push("/login")} className="btn btn-primary w-full">
            Retour a la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className={`flex-1 transition-all duration-300 overflow-y-auto ${sidebarOpen ? "ml-64" : "ml-0"}`}>
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-heading font-bold text-primary-800">Mon Profil</h1>
              <button onClick={handleLogout} className="btn btn-ghost flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Deconnexion
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* User Info Card */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-cream-200">
                <h2 className="text-lg font-semibold text-primary-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Informations personnelles
                </h2>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-600">{user.name?.charAt(0) || "U"}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-primary-800">{user.name}</h3>
                    <p className="text-primary-500">{user.email}</p>
                  </div>
                </div>

                <hr className="my-4 border-cream-200" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-primary-500 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Role
                    </span>
                    <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-primary-500 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Division
                    </span>
                    <span className="px-3 py-1 border border-primary-200 text-primary-700 rounded-full text-sm">
                      {user.division}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-primary-500 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Membre depuis
                    </span>
                    <span className="text-sm text-primary-600">
                      {new Date(user.createdAt).toLocaleDateString("fr-FR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Division Info Card */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-cream-200">
                <h2 className="text-lg font-semibold text-primary-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Ma Division
                </h2>
                
                <div className="mb-4">
                  <h3 className="font-semibold text-lg text-primary-800">{user.division}</h3>
                  <p className="text-primary-500">{DIVISION_LABELS[user.division] || "Division"}</p>
                </div>
                
                <hr className="my-4 border-cream-200" />
                
                <div className={`p-4 rounded-lg ${user.role === "ADMIN" || user.role === "CENADI_DIRECTOR" ? "bg-green-50" : "bg-blue-50"}`}>
                  <p className={`text-sm ${user.role === "ADMIN" || user.role === "CENADI_DIRECTOR" ? "text-green-700" : "text-blue-700"}`}>
                    {user.role === "ADMIN" || user.role === "CENADI_DIRECTOR" 
                      ? "En tant qu administrateur ou directeur, vous avez acces a tous les documents de toutes les divisions."
                      : `Vous avez acces uniquement aux documents de votre division (${user.division}).`
                    }
                  </p>
                </div>
              </div>

              {/* Stats Card */}
              {stats && (
                <div className="md:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-cream-200">
                  <h2 className="text-lg font-semibold text-primary-800 mb-2">Statistiques d utilisation</h2>
                  <p className="text-primary-500 text-sm mb-4">Votre activite sur la plateforme</p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <svg className="w-8 h-8 mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="text-2xl font-bold text-primary-800">{stats.totalSearches}</p>
                      <p className="text-sm text-primary-500">Recherches</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <svg className="w-8 h-8 mx-auto mb-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <p className="text-2xl font-bold text-primary-800">{stats.totalUploads}</p>
                      <p className="text-sm text-primary-500">Documents uploades</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <svg className="w-8 h-8 mx-auto mb-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-2xl font-bold text-primary-800">{stats.totalDocumentsViewed}</p>
                      <p className="text-sm text-primary-500">Documents consultes</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
