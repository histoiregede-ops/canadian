import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SHOP = {
  name: 'Electro Canadien',
  address: 'Mali Hamdalaye aci 2000 pres du terrain de foot',
  phone: '+223 77 44 78 44',
  email: 'contact@electrocanadien.com',
  whatsapp: '22377447844'
};

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  private formatCurrency(amount: number): string {
    const val = Math.round(amount || 0);
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
  }

  async generateReceipt(order: any): Promise<void> {
    const doc = new jsPDF();

    // Logo
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

    // Cachet / Stamp — chargé en parallèle
    let cachetData: string | null = null;
    try {
      const cachetResp = await fetch('/cachet.svg');
      const svgText = await cachetResp.text();
      cachetData = await this.svgToPngDataUrl(svgText, 300, 300);
    } catch (e) {
      console.warn('Cachet non chargé pour le reçu:', e);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(SHOP.name.toUpperCase(), 105, 20, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(SHOP.address, 105, 28, { align: 'center' });
    doc.text(`Tel: ${SHOP.phone}  |  WhatsApp: ${SHOP.whatsapp}`, 105, 34, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`RECU DE VENTE: ${order.orderNumber || 'PROV-001'}`, 14, 48);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 14, 55);
    doc.text(`Moyen de paiement: ${order.paymentMethod || 'cash'}`, 14, 62);

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
      startY: 72,
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

    // Cachet / Stamp miniaturisé
    if (cachetData) {
      const cachetSize = 22; // pixels sur le PDF
      const cachetX = 148;   // à droite, centré sous le total
      const cachetY = finalY + 12;
      doc.addImage(cachetData, 'PNG', cachetX, cachetY, cachetSize, cachetSize);
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Merci de votre confiance !', 105, finalY + 50, { align: 'center' });

    doc.save(`Recu_${order.orderNumber || 'PROV-001'}.pdf`);
  }

  /** Convertit un SVG text en PNG data URL via canvas */
  private async svgToPngDataUrl(svgText: string, width: number, height: number): Promise<string> {
    return new Promise((resolve, reject) => {
      // Encoder le SVG en base64 pour l'utiliser comme source d'image
      const encoded = btoa(unescape(encodeURIComponent(svgText)));
      const svgDataUrl = `data:image/svg+xml;base64,${encoded}`;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }
        // Fond blanc pour éviter la transparence
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load SVG image'));
      img.src = svgDataUrl;
    });
  }

  private formatNumber(amount: number): string {
    const val = Math.round(amount || 0);
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
}
