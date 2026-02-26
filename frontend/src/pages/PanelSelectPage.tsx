import { Link } from 'react-router-dom';

export default function PanelSelectPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center">Panel Seçimi</h1>
        <p className="text-gray-600 text-center mt-2">Giriş yapmak istediğiniz paneli seçin</p>

        <div className="mt-8 space-y-3">
          <Link
            to="/login"
            className="w-full inline-flex justify-center items-center px-4 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700"
          >
            Admin / Kurye / Restoran
          </Link>

          <Link
            to="/customer/login"
            className="w-full inline-flex justify-center items-center px-4 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Müşteri
          </Link>
        </div>
      </div>
    </div>
  );
}
