import GroceryItemForm from '../components/management/GroceryItemForm.jsx';

export default function GroceryItemsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Grocery Items</h1>
      <p className="text-sm text-gray-500">
        Canonical product catalogue — used for cross-store price comparison (Phase 2).
      </p>
      <GroceryItemForm />
    </div>
  );
}
