"use client";

import styles from "./listToolbar.module.css";

export interface ToolbarOption {
  value: string;
  label: string;
}

export interface ToolbarSelect {
  key: string;
  label: string;
  value: string;
  options: ToolbarOption[];
  onChange: (value: string) => void;
}

// The search / filter / sort bar shown above every admin list.
// A filter counts as "active" when its value isn't the first option ("All ...").
export default function ListToolbar({
  search,
  onSearch,
  placeholder = "Search...",
  filters = [],
  sort,
  onClear,
  total,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  filters?: ToolbarSelect[];
  sort: ToolbarSelect;
  onClear: () => void;
  total?: number;
}) {
  const activeFilters = filters.filter((f) => f.value !== f.options[0]?.value).length;
  const dirty = !!search.trim() || activeFilters > 0 || sort.value !== sort.options[0]?.value;

  return (
    <div className={styles.bar}>
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon} aria-hidden="true">
          ⌕
        </span>
        <input
          className={styles.search}
          type="search"
          value={search}
          placeholder={placeholder}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search"
        />
      </div>

      {filters.map((f) => (
        <label key={f.key} className={styles.field}>
          <span className={styles.fieldLabel}>{f.label}</span>
          <select
            className={`${styles.select} ${f.value !== f.options[0]?.value ? styles.selectOn : ""}`}
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
          >
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Sort by</span>
        <select className={styles.select} value={sort.value} onChange={(e) => sort.onChange(e.target.value)}>
          {sort.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {(dirty || total !== undefined) && (
        <div className={styles.meta}>
          {total !== undefined && (
            <span className={styles.count}>
              {total} result{total === 1 ? "" : "s"}
            </span>
          )}
          {dirty && (
            <button className={styles.clear} type="button" onClick={onClear}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
