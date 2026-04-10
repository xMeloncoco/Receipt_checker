import StoreList from '../components/management/StoreList.jsx';

export default function StoresPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Stores</h1>
      <StoreList />
    </div>
  );
}
