import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface UnactivatedUserItem {
  name: string;
  code: string;
}

/**
 * Generates an elegant, professional PDF containing ONLY the names of unactivated
 * users and their registration codes.
 */
export function generateUnactivatedUsersPdf(users: UnactivatedUserItem[]): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Sort alphabetically by member name
  const sortedUsers = [...users].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Brand Title (Terracotta / Sienna #9e5326)
  doc.setTextColor(158, 83, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('OBEAG', 14, 18);

  // 2. Document Title
  doc.setTextColor(61, 47, 38); // #3d2f26
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Unactivated Users & Registration Codes', 14, 26);

  // 3. Metadata Subtitle
  doc.setTextColor(125, 107, 95); // #7d6b5f
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(
    `Generated on: ${dateFormatted} at ${timeFormatted}  |  Total Unactivated Members: ${sortedUsers.length}`,
    14,
    32
  );

  // 4. Divider Line
  doc.setDrawColor(220, 210, 200);
  doc.setLineWidth(0.4);
  doc.line(14, 35, pageWidth - 14, 35);

  // 5. Table - STRICTLY ONLY Serial Number, Member Name, and Registration Code
  const tableRows = sortedUsers.map((user, idx) => [
    (idx + 1).toString(),
    user.name,
    user.code,
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['#', 'Member Name', 'Registration Code']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [158, 83, 38], // Obeag primary color
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left',
    },
    columnStyles: {
      0: {
        halign: 'center',
        cellWidth: 16,
      },
      1: {
        halign: 'left',
        cellWidth: 'auto',
        fontStyle: 'bold',
      },
      2: {
        halign: 'center',
        cellWidth: 50,
        font: 'courier',
        fontStyle: 'bold',
        fontSize: 11,
      },
    },
    styles: {
      fontSize: 9.5,
      cellPadding: 3.5,
      textColor: [61, 47, 38],
      lineColor: [225, 215, 205],
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [250, 245, 240], // Light warm tint matching background
    },
    margin: { left: 14, right: 14, bottom: 20 },
  });

  // 6. Professional Footer with accurate total page count on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 130, 120);

    // Left footer text
    doc.text(
      'OBEAG Community Portal - Confidential Registration Document',
      14,
      pageHeight - 10
    );

    // Right footer page count
    const pageText = `Page ${i} of ${totalPages}`;
    const textWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - 14 - textWidth, pageHeight - 10);
  }

  return doc;
}

/**
 * Triggers printing of the unactivated users PDF via browser print preview.
 */
export function printUnactivatedUsersPdf(users: UnactivatedUserItem[]): void {
  const doc = generateUnactivatedUsersPdf(users);

  // Set the auto-print action in the PDF
  doc.autoPrint();

  // Create a blob URL
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);

  // Open in a new tab/window which triggers the native browser print preview
  const printWindow = window.open(blobUrl, '_blank');

  if (!printWindow) {
    // Fallback: If popup blocker blocked the new window, use a hidden iframe
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      };
    } catch {
      // Last resort fallback: direct save
      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`OBEAG_Unactivated_Users_${dateStr}.pdf`);
      URL.revokeObjectURL(blobUrl);
    }
  } else {
    // Clean up blob URL after print window has loaded
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 60000);
  }
}

/**
 * Directly downloads the unactivated users PDF file.
 */
export function downloadUnactivatedUsersPdf(users: UnactivatedUserItem[]): void {
  const doc = generateUnactivatedUsersPdf(users);
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`OBEAG_Unactivated_Users_${dateStr}.pdf`);
}
