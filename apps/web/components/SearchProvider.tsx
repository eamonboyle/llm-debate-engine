"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";

type SearchContextValue = {
    open: boolean;
    openSearch: () => void;
    closeSearch: () => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const openSearch = useCallback(() => setOpen(true), []);
    const closeSearch = useCallback(() => setOpen(false), []);

    const value = useMemo(
        () => ({ open, openSearch, closeSearch }),
        [open, openSearch, closeSearch],
    );

    return (
        <SearchContext.Provider value={value}>
            {children}
        </SearchContext.Provider>
    );
}

export function useSearch() {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error("useSearch must be used within SearchProvider");
    }
    return context;
}
