import { Expense } from './supabase';
import { formatCurrency } from './currency';
import { CompanySettings } from './companySettings';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToCSV(expenses: Expense[], filename: string) {
  const headers = [
    'Date',
    'Title',
    'Category',
    'Amount',
    'Payment Method',
    'Vendor',
    'GST Number',
    'Invoice Number',
    'Company Name',
    'Notes',
    'Recurring',
    'Frequency'
  ];

  const rows = expenses.map(expense => [
    new Date(expense.date).toLocaleDateString(),
    expense.title,
    expense.category,
    expense.amount,
    expense.payment_method,
    expense.vendor_name || '',
    expense.gst_number || '',
    expense.invoice_number || '',
    expense.company_name || '',
    expense.notes || '',
    expense.is_recurring ? 'Yes' : 'No',
    expense.recurring_frequency || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(
  expenses: Expense[],
  filename: string,
  reportType: string,
  dateRange?: string,
  companySettings?: CompanySettings
) {
  try {
    const doc = new jsPDF();
    const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

    const categories = expenses.reduce((acc, exp) => {
      if (!acc[exp.category]) {
        acc[exp.category] = 0;
      }
      acc[exp.category] += parseFloat(exp.amount.toString());
      return acc;
    }, {} as Record<string, number>);

    let yPosition = 20;

    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text('ExpensePilot', 105, yPosition, { align: 'center' });

    yPosition += 10;
    doc.setFontSize(14);
    doc.setTextColor(75, 85, 99);
    doc.text(`${reportType} Expense Report`, 105, yPosition, { align: 'center' });

    if (dateRange) {
      yPosition += 7;
      doc.setFontSize(10);
      doc.text(dateRange, 105, yPosition, { align: 'center' });
    }

    yPosition += 7;
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, yPosition, { align: 'center' });

    yPosition += 15;

    doc.setFillColor(243, 244, 246);
    doc.rect(15, yPosition, 60, 25, 'F');
    doc.rect(80, yPosition, 60, 25, 'F');
    doc.rect(145, yPosition, 50, 25, 'F');

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text('TOTAL EXPENSES', 45, yPosition + 7, { align: 'center' });
    doc.text('TRANSACTIONS', 110, yPosition + 7, { align: 'center' });
    doc.text('CATEGORIES', 170, yPosition + 7, { align: 'center' });

    doc.setFontSize(16);
    doc.setTextColor(17, 24, 39);
    doc.text(formatCurrency(totalAmount), 45, yPosition + 18, { align: 'center' });
    doc.text(expenses.length.toString(), 110, yPosition + 18, { align: 'center' });
    doc.text(Object.keys(categories).length.toString(), 170, yPosition + 18, { align: 'center' });

    yPosition += 35;

    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text('Category Breakdown', 15, yPosition);
    yPosition += 5;

    const categoryData = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .map(([category, amount]) => [category, formatCurrency(amount)]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Category', 'Amount']],
      body: categoryData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 15, right: 15 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text('Expense Details', 15, yPosition);
    yPosition += 5;

    const expenseData = expenses.map(expense => [
      new Date(expense.date).toLocaleDateString(),
      expense.title,
      expense.category,
      expense.payment_method,
      formatCurrency(parseFloat(expense.amount.toString()))
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Title', 'Category', 'Payment', 'Amount']],
      body: expenseData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: 30 },
        4: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 15, right: 15 }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Page ${i} of ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please check the console for details.');
  }
}
