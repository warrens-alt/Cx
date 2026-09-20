const fs = require('fs');

let ctxCode = fs.readFileSync('src/lib/FilterContext.tsx', 'utf8');
ctxCode = ctxCode.replace(
  "setFilter: (key: string, value: string) => void;",
  "setFilter: (key: string, value: string) => void;\n  setFilters: (newFilters: Record<string, string>) => void;"
);

ctxCode = ctxCode.replace(
  "const clearFilters = () => {",
  `  const setFiltersMulti = (newFilters: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(newFilters)) {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {`
);

ctxCode = ctxCode.replace(
  "<FilterContext.Provider value={{ filters, setFilter, clearFilters, queryString }}>",
  "<FilterContext.Provider value={{ filters, setFilter, setFilters: setFiltersMulti, clearFilters, queryString }}>"
);

fs.writeFileSync('src/lib/FilterContext.tsx', ctxCode);

let dfCode = fs.readFileSync('src/components/DateFilter.tsx', 'utf8');
dfCode = dfCode.replace(
  "const { filters, setFilter, clearFilters } = useFilters();",
  "const { filters, setFilters, clearFilters } = useFilters();"
);

dfCode = dfCode.replace(
  `  const handleApply = () => {
    if (startDate) {
      setFilter('startDate', startDate);
    } else {
      setFilter('startDate', '');
    }
    if (endDate) {
      setFilter('endDate', endDate);
    } else {
      setFilter('endDate', '');
    }
  };`,
  `  const handleApply = () => {
    setFilters({
      startDate: startDate || '',
      endDate: endDate || ''
    });
  };`
);

fs.writeFileSync('src/components/DateFilter.tsx', dfCode);
