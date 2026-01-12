"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Division options matching CENADI structure
const DIVISIONS = [
  { code: "DEP", name: "Division des Etudes et Projets" },
  { code: "DEL", name: "Division de l Exploitation et des Logiciels" },
  { code: "DTB", name: "Division de la Teleinformatique et de la Bureautique" },
  { code: "DIRE", name: "Division de l Informatique appliquee a la Recherche et a l Enseignement" },
  { code: "DAAF", name: "Division des Affaires Administratives et Financieres" },
];

// Role options for registration (Director will be seeded directly)
const ROLES = [
  { value: "USER", label: "Utilisateur" },
  { value: "DIVISION_HEAD", label: "Chef de Division" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    division: "",
    role: "USER",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caracteres");
      return;
    }

    if (!formData.division) {
      setError("Veuillez selectionner une division");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          division: formData.division,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l inscription");
      }

      router.push("/login?registered=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l inscription");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-800 via-primary-900 to-primary-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-600 rounded-2xl shadow-lg mb-4">
            <span className="text-3xl font-bold text-cream-100">C</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-cream-100">CENADI</h1>
          <p className="text-cream-400 mt-1">Systeme de Recherche Documentaire</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-primary-800 mb-6 text-center">Creer un compte</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-primary-700 mb-1">Nom complet</label>
              <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required
                className="w-full px-4 py-3 bg-cream-50 border border-cream-300 rounded-lg text-primary-800 placeholder:text-primary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                placeholder="Jean Dupont" />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary-700 mb-1">Adresse email</label>
              <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required autoComplete="email"
                className="w-full px-4 py-3 bg-cream-50 border border-cream-300 rounded-lg text-primary-800 placeholder:text-primary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                placeholder="votre.email@cenadi.cm" />
            </div>

            <div>
              <label htmlFor="division" className="block text-sm font-medium text-primary-700 mb-1">Division</label>
              <select id="division" name="division" value={formData.division} onChange={handleChange} required
                className="w-full px-4 py-3 bg-cream-50 border border-cream-300 rounded-lg text-primary-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all">
                <option value="">Selectionnez une division</option>
                {DIVISIONS.map((div) => (
                  <option key={div.code} value={div.code}>{div.code} - {div.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-primary-700 mb-1">Role</label>
              <select id="role" name="role" value={formData.role} onChange={handleChange} required
                className="w-full px-4 py-3 bg-cream-50 border border-cream-300 rounded-lg text-primary-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all">
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary-700 mb-1">Mot de passe</label>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} required autoComplete="new-password"
                  className="w-full px-4 py-3 bg-cream-50 border border-cream-300 rounded-lg text-primary-800 placeholder:text-primary-300 pr-12 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                  placeholder="********" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600 transition-colors">
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary-700 mb-1">Confirmer le mot de passe</label>
              <div className="relative">
                <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleChange} required autoComplete="new-password"
                  className="w-full px-4 py-3 bg-cream-50 border border-cream-300 rounded-lg text-primary-800 placeholder:text-primary-300 pr-12 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                  placeholder="********" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600 transition-colors">
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full py-3 px-4 bg-primary-700 hover:bg-primary-800 text-cream-100 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6">
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Inscription en cours...
                </>
              ) : "S inscrire"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-cream-300" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-primary-400">ou</span></div>
          </div>

          <p className="text-center text-sm text-primary-500">
            Deja un compte?{" "}
            <Link href="/login" className="font-semibold text-primary-700 hover:text-primary-800 hover:underline">Se connecter</Link>
          </p>
        </div>

        <p className="text-center text-cream-500 text-sm mt-6">2024 CENADI. Tous droits reserves.</p>
      </div>
    </div>
  );
}