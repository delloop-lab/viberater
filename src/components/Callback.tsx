import React from 'react';

const Callback: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const entries = Array.from(params.entries());

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-100 via-blue-100 to-teal-100">
      <h1 className="text-3xl font-bold mb-4 text-blue-900">Callback received!</h1>
      {entries.length > 0 ? (
        <div className="bg-white/80 rounded-lg p-4 shadow">
          <h2 className="text-xl font-semibold mb-2 text-blue-800">Query Parameters:</h2>
          <ul className="text-blue-700">
            {entries.map(([key, value]) => (
              <li key={key}><strong>{key}:</strong> {value}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-blue-700">No query parameters found.</p>
      )}
    </div>
  );
};

export default Callback; 