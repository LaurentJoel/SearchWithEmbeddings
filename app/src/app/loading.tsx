export default function Loading() {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 
                      bg-primary-800 rounded-2xl shadow-lg mb-6 animate-pulse">
          <span className="text-4xl font-bold text-cream-100">C</span>
        </div>
        
        {/* Loading Spinner */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce" 
               style={{ animationDelay: "0ms" }} />
          <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce" 
               style={{ animationDelay: "150ms" }} />
          <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce" 
               style={{ animationDelay: "300ms" }} />
        </div>
        
        {/* Text */}
        <p className="text-primary-600 font-medium">
          Chargement...
        </p>
      </div>
    </div>
  );
}
