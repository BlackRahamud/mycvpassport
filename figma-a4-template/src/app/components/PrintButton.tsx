export function PrintButton() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition-colors print:hidden"
      style={{
        zIndex: 1000
      }}
    >
      📄 Print / Save as PDF
    </button>
  );
}
