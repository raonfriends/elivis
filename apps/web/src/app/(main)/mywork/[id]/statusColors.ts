export const TAG_COLORS: Record<string, { badge: string; dot: string }> = {
    gray:   { badge: "bg-stone-100 text-stone-600",   dot: "bg-stone-400" },
    red:    { badge: "bg-red-100 text-red-700",        dot: "bg-red-500" },
    orange: { badge: "bg-orange-100 text-orange-700",  dot: "bg-orange-500" },
    yellow: { badge: "bg-yellow-100 text-yellow-700",  dot: "bg-yellow-500" },
    green:  { badge: "bg-green-100 text-green-700",    dot: "bg-green-500" },
    blue:   { badge: "bg-blue-100 text-blue-700",      dot: "bg-blue-500" },
    purple: { badge: "bg-purple-100 text-purple-700",  dot: "bg-purple-500" },
    pink:   { badge: "bg-pink-100 text-pink-700",      dot: "bg-pink-500" },
};

export const COLOR_KEYS = Object.keys(TAG_COLORS);
