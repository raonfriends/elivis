"use client";

import { useEffect, useRef, useState } from "react";

export function FilterSortDropdown<T extends string>({
    value,
    options,
    onChange,
    label,
}: {
    value: T;
    options: { value: T; label: string }[];
    onChange: (v: T) => void;
    label: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const current = options.find((o) => o.value === value);
    const isActive = value !== options[0]?.value;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    isActive
                        ? "border-stone-800 bg-stone-800 text-white"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                }`}
            >
                {isActive ? current?.label : label}
                <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-xl border border-stone-200 bg-white py-1 shadow-xl">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-stone-50 ${
                                value === opt.value ? "font-semibold text-stone-900" : "text-stone-600"
                            }`}
                        >
                            {opt.label}
                            {value === opt.value && (
                                <svg className="h-3 w-3 text-stone-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
