export function JsonViewer({ value }: { value: unknown }) {
  return (
    <pre className="overflow-auto rounded bg-gray-50 p-3 text-xs leading-relaxed text-gray-800">
      <code>{JSON.stringify(value, null, 2)}</code>
    </pre>
  );
}
