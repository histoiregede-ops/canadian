import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  private formatCurrency(amount: number): string {
    const val = Math.round(amount || 0);
    // On utilise une expression régulière pour ajouter les espaces des milliers.
    // On utilise un espace simple " " qui est parfaitement supporté par jsPDF.
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
  }

  async generateReceipt(order: any): Promise<void> {
    const doc = new jsPDF();

    try {
      const resp = await fetch('/logo_projet.png');
      const blob = await resp.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(base64, 'PNG', 14, 10, 40, 16);
    } catch (e) {
      console.warn('Logo non chargé pour le reçu:', e);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('ELECTRO CANADIEN', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Lome, Togo | Tel: +228 90 00 00 00', 105, 28, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`RECU DE VENTE: ${order.orderNumber || 'PROV-001'}`, 14, 45);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 14, 52);
    doc.text(`Moyen de paiement: ${order.paymentMethod || 'cash'}`, 14, 59);

    const safeItems = Array.isArray(order.items) ? order.items : [];
    const tableData = safeItems.map((item: any) => {
      const name = item.productName
        ? String(item.productName).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        : 'Produit';
      const qty = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const total = qty * unitPrice;
      return [name, qty.toString(), this.formatNumber(unitPrice), this.formatNumber(total)];
    });

    autoTable(doc, {
      startY: 70,
      head: [['Designation', 'Qte', 'Prix Unitaire', 'Total']],
      body: tableData,
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 40, halign: 'right' }
      },
      styles: {
        fontSize: 11,
        cellPadding: 4
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontSize: 11,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    const rightX = 190;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sous-total: ${this.formatCurrency(order.subtotal)}`, rightX, finalY + 10, { align: 'right' });
    doc.text(`Remise: -${this.formatCurrency(order.discount)}`, rightX, finalY + 17, { align: 'right' });
    doc.text(`Taxe/TVA: +${this.formatCurrency(order.tax)}`, rightX, finalY + 24, { align: 'right' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL NET: ${this.formatCurrency(order.totalAmount)}`, rightX, finalY + 34, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Merci de votre confiance !', 105, finalY + 50, { align: 'center' });

    doc.save(`Recu_${order.orderNumber || 'PROV-001'}.pdf`);
  }

  private formatNumber(amount: number): string {
    const val = Math.round(amount || 0);
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
}
