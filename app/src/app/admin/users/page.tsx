"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

// Divisions from SimpleSearchInterface
const DIVISIONS = [
  { code: "DEP", name: "Division des Etudes et Projets" },
  { code: "DEL", name: "Division de l Exploitation et des Logiciels" },
  { code: "DTB", name: "Division de la Teleinformatique et de la Bureautique" },
  { code: "DIRE", name: "Division de l Informatique appliquee a la Recherche et a l Enseignement" },
  { code: "DAAF", name: "Division des Affaires Administratives et Financieres" },
];

const ROLES = [
  { value: "ADMIN", label: "Administrateur" },
  { value: "CENADI_DIRECTOR", label: "Directeur" },
  { value: "DIVISION_HEAD", label: "Chef de Division" },
  { value: "USER", label: "Utilisateur" },
];

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  division: string | null;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export default function UsersPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER",
    division: "",
  });

  // Check admin access
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          router.push("/login");
          return;
        }
        const data = await response.json();
        if (data.user?.role !== "ADMIN") {
          router.push("/");
          return;
        }
      } catch (error) {
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({ name: "", email: "", password: "", role: "USER", division: "" });
    setError("");
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email,
      password: "",
      role: user.role,
      division: user.division || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setActionLoading(true);
    setError("");

    try {
      if (editingUser) {
        // Update existing user
        const response = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            role: formData.role,
            division: formData.division || null,
            ...(formData.password && { password: formData.password }),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erreur lors de la mise a jour");
        }
      } else {
        // Create new user
        if (!formData.password) {
          throw new Error("Mot de passe requis pour un nouveau utilisateur");
        }

        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erreur lors de la creation");
        }
      }

      await fetchUsers();
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (response.ok) {
        await fetchUsers();
      }
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setActionLoading(false);
      setDeleteConfirm(null);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      await fetchUsers();
    } catch (error) {
      console.error("Toggle failed:", error);
    }
  };

  const getRoleLabel = (role: string) => ROLES.find(r => r.value === role)?.label || role;
  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-purple-100 text-purple-700";
      case "CENADI_DIRECTOR": return "bg-blue-100 text-blue-700";
      case "DIVISION_HEAD": return "bg-green-100 text-green-700";
      default: return "bg-cream-200 text-primary-600";
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-heading font-bold text-primary-800">Gestion des utilisateurs</h1>
                <p className="text-primary-500">{users.length} utilisateur(s)</p>
              </div>
              <button onClick={handleOpenAdd} className="btn btn-primary">
                + Nouvel utilisateur
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-cream-50 border-b border-cream-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase">Utilisateur</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase">Division</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase">Statut</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-primary-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-100">
                    {users.map((user) => (
                      <tr key={user.id} className={`hover:bg-cream-50 ${!user.isActive ? "opacity-50" : ""}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                              {(user.name?.[0] || user.email[0]).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-primary-800">{user.name || "Sans nom"}</p>
                              <p className="text-sm text-primary-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {user.division ? (
                            <span className="px-2 py-1 text-xs font-medium bg-accent-100 text-accent-700 rounded">
                              {user.division}
                            </span>
                          ) : (
                            <span className="text-primary-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getRoleColor(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button onClick={() => handleToggleActive(user)}
                            className={`px-2 py-1 text-xs font-medium rounded ${user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {user.isActive ? "Actif" : "Inactif"}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleOpenEdit(user)} className="text-primary-600 hover:text-primary-800 mr-4">Modifier</button>
                          <button onClick={() => setDeleteConfirm(user.id)} className="text-red-600 hover:text-red-800">Supprimer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">{editingUser ? "Modifier" : "Nouvel utilisateur"}</h2>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Nom</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="Nom complet" />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="email@cenadi.cm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">
                  {editingUser ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}
                </label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="********" required={!editingUser} />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Division</label>
                <select value={formData.division} onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Aucune</option>
                  {DIVISIONS.map((div) => (
                    <option key={div.code} value={div.code}>{div.code} - {div.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Role</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg">
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-primary-600">Annuler</button>
              <button onClick={handleSave} disabled={actionLoading} className="btn btn-primary">
                {actionLoading ? "..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Confirmer la suppression</h3>
            <p className="text-primary-500 mb-4">Cette action desactivera le compte utilisateur.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-primary-600">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={actionLoading} className="btn bg-red-600 text-white hover:bg-red-700">
                {actionLoading ? "..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
