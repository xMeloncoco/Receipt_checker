import { NavLink } from 'react-router-dom';

const links = [
  { to: '/upload', label: 'Upload' },
  { to: '/history', label: 'History' },
  { to: '/stores', label: 'Stores' },
  { to: '/grocery-items', label: 'Grocery Items' },
];

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-6 h-14">
        <span className="font-bold text-indigo-700 text-lg tracking-tight">
          Receipt Tracker
        </span>
        <div className="flex items-center gap-1">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
