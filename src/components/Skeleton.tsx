

interface SkeletonProps {
    className?: string;
    variant?: 'rectangular' | 'circular' | 'text';
    width?: string | number;
    height?: string | number;
}

export const Skeleton = ({
    className = '',
    variant = 'rectangular',
    width,
    height
}: SkeletonProps) => {
    const baseClasses = "bg-gray-200 dark:bg-gray-700 relative overflow-hidden";
    const variantClasses = {
        rectangular: "rounded-lg",
        circular: "rounded-full",
        text: "rounded h-4 w-full"
    };

    const style = {
        width: width,
        height: height
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={style}
        >
            <div className="absolute inset-0 skeleton-shimmer" />
        </div>
    );
};

export const TransactionCardSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 mb-3 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
                {/* Icon Skeleton */}
                <Skeleton variant="circular" className="w-10 h-10 flex-shrink-0" />

                {/* Text Content Skeleton */}
                <div className="space-y-2 flex-1 max-w-[60%]">
                    <Skeleton variant="text" className="w-3/4 h-4" />
                    <Skeleton variant="text" className="w-1/2 h-3" />
                </div>
            </div>

            {/* Amount Skeleton */}
            <div className="flex flex-col items-end space-y-2">
                <Skeleton variant="text" className="w-20 h-5" />
                <Skeleton variant="text" className="w-12 h-3" />
            </div>
        </div>
    </div>
);

export const TransactionListSkeleton = ({ count = 5 }: { count?: number }) => (
    <div className="w-full animate-fade-in">
        {Array.from({ length: count }).map((_, i) => (
            <TransactionCardSkeleton key={`skeleton-${i}`} />
        ))}
    </div>
);
