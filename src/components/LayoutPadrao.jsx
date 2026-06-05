export default function LayoutPadrao({ titulo, children, onVoltar }) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{titulo}</h1>
        </div>

        {onVoltar && (
          <button
            onClick={onVoltar}
            className="px-4 py-2 rounded-lg border bg-white"
          >
            ← Voltar
          </button>
        )}
      </div>

      {children}
    </div>
  );
}
