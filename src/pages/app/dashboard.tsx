const { balance, error } = useDerivBalance()

{error && (
  <div className="mb-4 rounded-lg border border-red-700 bg-red-950/40 p-4 text-red-200">
    {error}
  </div>
)}

<div className="text-3xl font-bold text-white">
  {balance ? `$${balance}` : '—'}
</div>
