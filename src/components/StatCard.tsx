import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    subtext?: string;
    icon: React.ElementType;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color?: string; // Tailwind color class prefix (e.g., 'blue', 'green')
    delay?: number;
}

const StatCard = ({
    title,
    value,
    subtext,
    icon: Icon,
    trend,
    trendValue,
    color = 'blue',
    delay = 0
}: StatCardProps) => {
    // Map color prop to specific Tailwind classes with gradients
    const colorMap: Record<string, { bg: string; text: string; iconBg: string; border: string; shadow: string }> = {
        blue: {
            bg: 'bg-gradient-to-br from-blue-500/5 to-blue-600/10',
            text: 'text-blue-700 dark:text-blue-300',
            iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
            border: 'border-blue-200 dark:border-blue-800/30',
            shadow: 'shadow-blue-500/10 hover:shadow-blue-500/20'
        },
        green: {
            bg: 'bg-gradient-to-br from-emerald-500/5 to-emerald-600/10',
            text: 'text-emerald-700 dark:text-emerald-300',
            iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            border: 'border-emerald-200 dark:border-emerald-800/30',
            shadow: 'shadow-emerald-500/10 hover:shadow-emerald-500/20'
        },
        red: {
            bg: 'bg-gradient-to-br from-rose-500/5 to-rose-600/10',
            text: 'text-rose-700 dark:text-rose-300',
            iconBg: 'bg-gradient-to-br from-rose-500 to-rose-600',
            border: 'border-rose-200 dark:border-rose-800/30',
            shadow: 'shadow-rose-500/10 hover:shadow-rose-500/20'
        },
        purple: {
            bg: 'bg-gradient-to-br from-purple-500/5 to-purple-600/10',
            text: 'text-purple-700 dark:text-purple-300',
            iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
            border: 'border-purple-200 dark:border-purple-800/30',
            shadow: 'shadow-purple-500/10 hover:shadow-purple-500/20'
        },
        amber: {
            bg: 'bg-gradient-to-br from-amber-500/5 to-amber-600/10',
            text: 'text-amber-700 dark:text-amber-300',
            iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
            border: 'border-amber-200 dark:border-amber-800/30',
            shadow: 'shadow-amber-500/10 hover:shadow-amber-500/20'
        },
    };

    const selectedColor = colorMap[color] || colorMap.blue;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, ease: "easeOut" }}
            className={`relative overflow-hidden rounded-2xl p-4 border shadow-lg transition-all duration-300 group ${selectedColor.bg} ${selectedColor.border} ${selectedColor.shadow}`}
        >
            {/* Background Gradient Blob */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-30 ${selectedColor.iconBg.replace('bg-gradient-to-br', 'bg')}`} />

            {/* Content */}
            <div className="relative z-10 flex items-center gap-4">
                {/* Icon (Left Side) - Sub-card style */}
                <div className={`shrink-0 p-3 rounded-xl ${selectedColor.iconBg} shadow-md text-white transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ring-2 ring-white dark:ring-gray-800`}>
                    <Icon className="w-5 h-5" strokeWidth={2.5} />
                </div>

                {/* Text Info (Right Side) */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">{title}</h3>
                    <div className="flex flex-col">
                        <span className={`text-lg sm:text-xl font-bold tracking-tight leading-none ${selectedColor.text}`}>{value}</span>
                        {subtext && (
                            <p className="text-[10px] text-gray-400 font-medium mt-1 truncate">
                                {subtext}
                            </p>
                        )}
                        {trend && trendValue && (
                            <div className="flex items-center gap-1 mt-1.5">
                                <span className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${trend === 'up'
                                    ? 'bg-green-100/80 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                    : trend === 'down'
                                        ? 'bg-red-100/80 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                        : 'bg-gray-100/80 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400'
                                    }`}>
                                    {trend === 'up' ? <ArrowUpRight className="w-2.5 h-2.5" /> : trend === 'down' ? <ArrowDownRight className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                                    {trendValue}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default StatCard;
