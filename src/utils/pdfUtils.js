// src/utils/pdfUtils.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportAggregatedPDF(aggregatedItemsArray, currentWeek, supplierLabel) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Aggregated Products - Week ${currentWeek}`, 14, 20);
  doc.setFontSize(12);
  if (supplierLabel) {
    doc.text(`Supplier: ${supplierLabel}`, 14, 30);
  }

  const columns = [
    { header: 'ID - Name', dataKey: 'name' },
    { header: 'Qty', dataKey: 'quantity' },
    { header: 'Price', dataKey: 'price' },
    { header: 'Line Total', dataKey: 'total' }
  ];

  const rows = aggregatedItemsArray.map(item => ({
    name: `ID: ${item.id} - ${item.name}`,
    quantity: item.quantity,
    price: `$${parseFloat(item.price).toFixed(2)}`,
    total: `$${(item.price * item.quantity).toFixed(2)}`
  }));

  autoTable(doc, {
    startY: 40,
    head: [columns.map(col => col.header)],
    body: rows.map(row => columns.map(col => row[col.dataKey])),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185] },
    margin: { horizontal: 14 }
  });

  doc.save(`aggregated_products_week_${currentWeek}${supplierLabel ? `_${supplierLabel}` : ''}.pdf`);
}
