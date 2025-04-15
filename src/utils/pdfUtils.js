// src/utils/pdfUtils.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// 1) Import your local logo image
import logo from '../logo.png';

/**
 * Exports a PDF with items sorted alphabetically by 'name',
 * plus a custom header with the site logo and a final total line.
 *
 * @param {Array} aggregatedItemsArray - The array of aggregated items.
 * @param {string} currentWeek - The current week code.
 * @param {string} supplierLabel - The supplier name label.
 */
export function exportAggregatedPDF(aggregatedItemsArray, currentWeek, supplierLabel) {
  // Sort items by name
  const sortedItems = [...aggregatedItemsArray].sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Create a new PDF document
  const doc = new jsPDF();

  // 2) Insert the logo at top-left corner
  //    x=10, y=10, width=30, height auto (approx)
  doc.addImage(logo, 'PNG', 10, 10, 30, 0);

  // Optionally, add a horizontal line or some text offset
  doc.setLineWidth(0.5);
  // Draw a line from x=10 to x=200 at y=25
  doc.line(10, 25, 200, 25);

  // 3) Add main title or text below the logo/line
  let startY = 35; // move content down so it doesn't overlap
  doc.setFontSize(16);
  doc.text(`Produits agrégés – Semaine ${currentWeek}`, 14, startY);
  startY += 10;
  doc.setFontSize(12);
  if (supplierLabel) {
    doc.text(`Fournisseur: ${supplierLabel}`, 14, startY);
    startY += 10;
  }

  // 4) Prepare columns
  const columns = [
    { header: 'ID - Nom', dataKey: 'name' },
    { header: 'Qtée', dataKey: 'quantity' },
    { header: 'Prix', dataKey: 'price' },
    { header: 'Total', dataKey: 'total' },
  ];

  // 5) Prepare row data for autoTable
  const rows = sortedItems.map((item) => ({
    name: `ID: ${item.id} - ${item.name}`,
    quantity: item.quantity,
    price: `$${parseFloat(item.price).toFixed(2)}`,
    total: `$${(item.price * item.quantity).toFixed(2)}`,
  }));

  // 6) Use autoTable, starting below the header
  autoTable(doc, {
    startY: startY, // use the updated startY
    head: [columns.map((col) => col.header)],
    body: rows.map((row) => columns.map((col) => row[col.dataKey])),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185] },
    margin: { horizontal: 14 },
  });

  // Calculate the total aggregated cost
  const total = sortedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // 7) Add a total line below the table
  const finalY = doc.lastAutoTable.finalY || startY;
  doc.setFontSize(12);
  // Optionally set font to bold for the total line
  doc.setFont(undefined, 'bold');
  doc.text(`Total: $${total.toFixed(2)}`, 14, finalY + 10);

  // 8) Save the PDF
  doc.save(`aggregated_products_week_${currentWeek}${supplierLabel ? `_${supplierLabel}` : ''}.pdf`);
}

/**
 * Generates and saves a delivery bill PDF for an order
 * @param {Object} order - The order object
 * @param {String} companyName - The company name
 * @param {String} address - The delivery address
 */
export function exportDeliveryBillPDF(order, companyName, address) {
  const doc = new jsPDF();

  // Insert the logo at top-left corner
  doc.addImage(logo, 'PNG', 10, 10, 30, 0);

  doc.setLineWidth(0.5);
  doc.line(10, 25, 200, 25);

  let startY = 35;
  doc.setFontSize(16);
  doc.text('Delivery Bill', 14, startY);
  startY += 10;

  doc.setFontSize(12);
  doc.text(`Order ID: ${order.id}`, 14, startY);
  startY += 8;

  const deliveredOn = order.deliveredAt
    ? order.deliveredAt.toDate().toLocaleString()
    : 'N/A';
  doc.text(`Delivered on: ${deliveredOn}`, 14, startY);
  startY += 10;

  if (companyName) {
    doc.text(`Company: ${companyName}`, 14, startY);
    startY += 8;
  }

  doc.text(`Email: ${order.email}`, 14, startY);
  startY += 8;

  if (address) {
    doc.text(`Address: ${address}`, 14, startY);
    startY += 10;
  }

  const tableColumns = ['ID', 'Name', 'Quantity', 'Price'];
  const tableRows = (order.items || []).map(item => [
    item.id,
    item.name,
    item.quantity.toString(),
    `$${parseFloat(item.price).toFixed(2)}`
  ]);

  // Calculate total cost
  const totalCost = (order.items || []).reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  autoTable(doc, {
    startY,
    head: [tableColumns],
    body: tableRows,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });

  let finalY = doc.lastAutoTable.finalY || startY;
  if (order.signature) {
    doc.text('Signature:', 14, finalY + 15);
    doc.addImage(order.signature, 'PNG', 14, finalY + 20, 60, 30);
    finalY += 45;
  } else {
    finalY = finalY + 10;
  }

  doc.setFontSize(12);
  doc.setFont('', 'bold');
  doc.text(`Total: $${totalCost.toFixed(2)}`, 14, finalY + 10);

  // Save the PDF
  doc.save(`delivery_bill_order_${order.id}.pdf`);
}
