export default function Loading() {
  return (
    <div className="space-y-4 pt-4 animate-slide-up">
      {/* Hero skeleton */}
      <div className="h-24 rounded-3xl skeleton" />
      
      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 rounded-2xl skeleton" />
        <div className="h-20 rounded-2xl skeleton" />
        <div className="h-20 rounded-2xl skeleton" />
      </div>
      
      {/* Action cards skeleton */}
      <div className="h-3 w-28 rounded-full skeleton mt-2" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 rounded-2xl skeleton" />
        ))}
      </div>
    </div>
  );
}
