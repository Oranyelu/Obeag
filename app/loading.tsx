export default function Loading() {
    return (
        <div className="max-w-6xl mx-auto space-y-8 p-6 animate-pulse mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-2 w-full sm:w-auto">
                    <div className="h-8 bg-muted rounded-lg w-48"></div>
                    <div className="h-4 bg-muted rounded-lg w-72"></div>
                </div>
                <div className="h-10 bg-muted rounded-lg w-36"></div>
            </div>
            
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="h-28 bg-card border border-border rounded-xl p-6 space-y-3">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-8 bg-muted rounded w-2/3"></div>
                </div>
                <div className="h-28 bg-card border border-border rounded-xl p-6 space-y-3">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-8 bg-muted rounded w-2/3"></div>
                </div>
                <div className="h-28 bg-card border border-border rounded-xl p-6 space-y-3">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-8 bg-muted rounded w-2/3"></div>
                </div>
            </div>

            {/* Content Table Skeleton */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <div className="h-6 bg-muted rounded w-1/4"></div>
                <div className="space-y-3 pt-2">
                    <div className="h-12 bg-muted rounded-lg"></div>
                    <div className="h-12 bg-muted rounded-lg"></div>
                    <div className="h-12 bg-muted rounded-lg"></div>
                </div>
            </div>
        </div>
    );
}
