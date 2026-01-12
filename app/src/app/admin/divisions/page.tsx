"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";

interface Division {
  id: string;
  code: string;
  name: string;
  description?: string;
  userCount: number;
}

const DIVISION_NAMES: Record<string, string> = {
  DEP: "Division des Etudes et Projets",
  DEL: "Division de l Exploitation et des Logiciels",
  DTB: "Division de la Teleinformatique et de la Bureautique",
  DIRE: "Division de l Informatique appliquee a la Recherche et a l Enseignement",
  DAAF: "Division des Affaires Administratives et Financieres",
};

export default function DivisionsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchDivisions();
    }
  }, [user]);

  const fetchDivisions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/divisions");
      if (response.ok) {
        const data = await response.json();
        const allDivisions = Object.keys(DIVISION_NAMES).map((code) => {
          const existing = data.find((d: Division) => d.code === code);
          return existing || { id: code, code, name: DIVISION_NAMES[code], userCount: 0 };
        });
        setDivisions(allDivisions);
      }
    } catch (error) {
      console.error("Failed to fetch divisions:", error);
      setDivisions(Object.entries(DIVISION_NAMES).map(([code, name]) => ({ id: code, code, name, userCount: 0 })));
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-heading font-bold text-primary-800">Gestion des divisions</h1>
                <p className="text-primary-500 mt-1">Divisions CENADI et leurs utilisateurs</p>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 border border-cream-200 animate-pulse">
                    <div className="h-6 bg-cream-300 rounded w-1/3 mb-4" />
                    <div className="h-4 bg-cream-200 rounded w-2/3 mb-4" />
                    <div className="flex gap-4"><div className="h-4 bg-cream-200 rounded w-1/4" /></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {divisions.map((division) => (
                  <div key={division.id} className="bg-white rounded-xl p-6 border border-cream-200 hover:border-primary-300 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-cream-100 font-bold text-lg">
                          {division.code.substring(0, 2)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-primary-800">{division.code}</h3>
                          <p className="text-sm text-primary-500 line-clamp-2">{division.name}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 pt-4 border-t border-cream-100">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span className="text-sm text-primary-600">{division.userCount} utilisateur{division.userCount !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 p-4 bg-cream-100 rounded-lg text-center">
              <p className="text-primary-600">
                <span className="font-semibold text-primary-800">{divisions.length}</span> divisions CENADI -
                <span className="font-semibold text-primary-800 ml-1">{divisions.reduce((acc, d) => acc + d.userCount, 0)}</span> utilisateurs au total
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}