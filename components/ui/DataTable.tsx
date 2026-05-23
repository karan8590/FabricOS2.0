import React, { useState, useEffect } from 'react';
import styles from './DataTable.module.css';
import tableStyles from './Table.module.css';
import LoadingSkeleton from './LoadingSkeleton';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  rowKey?: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
}

// 1. Memoized Table Row Component
const DataTableRow = React.memo(({ 
  row, 
  rowIdx, 
  columns, 
  onRowClick, 
  rowKey 
}: { 
  row: any; 
  rowIdx: number; 
  columns: Column<any>[]; 
  onRowClick?: (row: any) => void; 
  rowKey: (row: any, index: number) => string | number; 
}) => {
  return (
    <tr
      className={`${tableStyles.tr} ${onRowClick ? styles.clickableRow : ''}`}
      onClick={() => onRowClick?.(row)}
    >
      {columns.map((col, colIdx) => {
        const content =
          typeof col.accessor === 'function'
            ? col.accessor(row)
            : (row[col.accessor] as React.ReactNode);

        return (
          <td
            key={colIdx}
            className={tableStyles.td}
            style={{
              textAlign: col.align || 'left',
            }}
          >
            {content}
          </td>
        );
      })}
    </tr>
  );
});
DataTableRow.displayName = 'DataTableRow';

// 2. Memoized Mobile Card Component
const DataMobileCard = React.memo(({ 
  row, 
  rowIdx, 
  columns, 
  onRowClick, 
  rowKey 
}: { 
  row: any; 
  rowIdx: number; 
  columns: Column<any>[]; 
  onRowClick?: (row: any) => void; 
  rowKey: (row: any, index: number) => string | number; 
}) => {
  return (
    <div
      className={`${styles.mobileCard} ${onRowClick ? styles.clickableCard : ''}`}
      onClick={() => onRowClick?.(row)}
    >
      {columns.map((col, colIdx) => {
        const content =
          typeof col.accessor === 'function'
            ? col.accessor(row)
            : (row[col.accessor] as React.ReactNode);

        return (
          <div key={colIdx} className={styles.cardRow}>
            <span className={styles.cardLabel}>{col.header}</span>
            <span className={styles.cardValue}>{content}</span>
          </div>
        );
      })}
    </div>
  );
});
DataMobileCard.displayName = 'DataMobileCard';

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyState,
  rowKey = (_, idx) => idx,
  onRowClick,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // Reset pagination when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  if (loading) {
    return (
      <div className={styles.skeletonContainer}>
        <LoadingSkeleton variant="table" rows={5} />
      </div>
    );
  }

  if (data.length === 0) {
    return <>{emptyState || <div className={styles.empty}>No records found</div>}</>;
  }

  // Check if data length exceeds 50 rows to enable 20-row pagination
  const needsPagination = data.length > 50;
  const startIndex = needsPagination ? (currentPage - 1) * rowsPerPage : 0;
  const endIndex = needsPagination ? startIndex + rowsPerPage : data.length;
  const paginatedData = data.slice(startIndex, endIndex);
  const totalPages = Math.ceil(data.length / rowsPerPage);

  return (
    <div className={styles.container}>
      {/* Desktop view: Table */}
      <div className={styles.desktopTable}>
        <table className={tableStyles.table}>
          <thead className={tableStyles.thead}>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={tableStyles.th}
                  style={{
                    width: col.width,
                    textAlign: col.align || 'left',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={tableStyles.tbody}>
            {paginatedData.map((row, rowIdx) => (
              <DataTableRow 
                key={rowKey(row, rowIdx)}
                row={row}
                rowIdx={rowIdx}
                columns={columns}
                onRowClick={onRowClick}
                rowKey={rowKey}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view: Stacked Cards */}
      <div className={styles.mobileCards}>
        {paginatedData.map((row, rowIdx) => (
          <DataMobileCard 
            key={rowKey(row, rowIdx)}
            row={row}
            rowIdx={rowIdx}
            columns={columns}
            onRowClick={onRowClick}
            rowKey={rowKey}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {needsPagination && (
        <div className={styles.pagination}>
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className={styles.paginationBtn}
          >
            Previous
          </button>
          <span className={styles.paginationInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            className={styles.paginationBtn}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
