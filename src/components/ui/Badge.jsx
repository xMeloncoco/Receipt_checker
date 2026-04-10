export default function Badge({ isNew }) {
  if (isNew) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
        NEW
      </span>
    );
  }
  return <span className="text-gray-400 text-sm">—</span>;
}
