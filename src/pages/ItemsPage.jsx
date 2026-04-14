import GroceryItemForm from '../components/management/GroceryItemForm.jsx';

export default function ItemsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Items</h1>
      <p className="text-sm text-gray-500">
        Canonical product catalogue — used for cross-store price comparison.
      </p>
      <GroceryItemForm />
    </div>
  );
}
