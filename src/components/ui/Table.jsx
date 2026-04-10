export default function Table({ columns, rows, emptyMessage = 'No data.' }) {
  if (!rows || rows.length === 0) {
    return (
      <p className="py-8 text-center text-gray-400 text-sm">{emptyMessage}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="hover:bg-gray-50">
              {columns.map(col => (
                <td key={col.key} className="px-4 py-2 text-gray-700 whitespace-nowrap">
                  {col.render ? col.render(row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
