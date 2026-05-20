import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
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

  generateReceipt(order: any): void {
    const doc = new jsPDF();

    try {
      // On retire le slash initial qui peut poser problème selon la configuration du serveur de dev
      // On s'assure que le format est bien spécifié
      doc.addImage('logo_electro_canadien.png', 'PNG', 14, 10, 25, 25);
    } catch (error) {
      console.error("Erreur critique chargement logo:", error);
    }

    // Company Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('ELECTRO CANADIEN', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Lome, Togo | Tel: +228 90 00 00 00', 105, 28, { align: 'center' });

    // Receipt Info
    doc.setFontSize(12);
    doc.text(`RECU DE VENTE: ${order.orderNumber || 'PROV-001'}`, 14, 45);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 52);
    doc.text(`Moyen de paiement: ${order.paymentMethod}`, 14, 59);

    // Table
    const tableData = order.items.map((item: any) => [
      item.productName ? item.productName.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : 'Produit',
      item.quantity,
      this.formatCurrency(item.unitPrice),
      this.formatCurrency(item.quantity * item.unitPrice)
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Designation', 'Qte', 'Prix Unitaire', 'Total']],
      body: tableData,
    });

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    const rightX = 190; // Position pour l'alignement à droite
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sous-total: ${this.formatCurrency(order.subtotal)}`, rightX, finalY + 10, { align: 'right' });
    doc.text(`Remise: -${this.formatCurrency(order.discount)}`, rightX, finalY + 17, { align: 'right' });
    doc.text(`Taxe/TVA: +${this.formatCurrency(order.tax)}`, rightX, finalY + 24, { align: 'right' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL NET: ${this.formatCurrency(order.totalAmount)}`, rightX, finalY + 34, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Merci de votre confiance !', 105, finalY + 50, { align: 'center' });

    doc.save(`Recu_${order.orderNumber}.pdf`);
  }
}
