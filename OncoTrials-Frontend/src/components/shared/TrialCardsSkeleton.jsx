export function SkeletonCards() {
    return (
        <div className="relative flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
            <div className="h-1.5 w-full bg-gray-200" />
            <div className="flex flex-col flex-1 p-5 gap-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                    <div className="h-5 w-20 bg-gray-200 rounded-full" />
                </div>
                <div className="space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-5/6" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                    <div className="h-6 w-24 bg-gray-200 rounded-lg" />
                    <div className="h-8 w-24 bg-gray-200 rounded-lg" />
                </div>
            </div>
        </div>
    )
}