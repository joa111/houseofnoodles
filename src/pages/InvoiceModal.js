import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getInvoiceByOrderId } from '../services/supabaseService';
import { X, Share2, Printer, Download } from 'lucide-react';
import logo from '../logo.svg';

const InvoiceModal = ({ orderId, onClose }) => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const invoiceRef = useRef(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      // Prevent fetching if orderId is missing/undefined
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const invoiceData = await getInvoiceByOrderId(orderId);
        setInvoice(invoiceData);
      } catch (error) {
        console.error('Failed to fetch invoice', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  const generatePDFBlob = async () => {
    if (!invoiceRef.current) return null;

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      return pdf;
    } catch (err) {
      console.error("PDF generation failed", err);
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    const pdf = await generatePDFBlob();
    if (pdf) {
      pdf.save(`Invoice_${invoice.invoice_number}.pdf`);
    } else {
      alert("Failed to generate PDF.");
    }
  };

  const handleShareWhatsApp = async () => {
    if (!invoice) return;

    // 1. Try to generate the PDF
    const pdf = await generatePDFBlob();
    if (!pdf) {
      alert("Could not generate invoice for sharing.");
      return;
    }

    const filename = `Invoice_${invoice.invoice_number}.pdf`;
    const pdfBlob = pdf.output('blob');
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    // 2. Try Native Sharing (ONLY on Mobile)
    // Desktop share dialogs often lack WhatsApp or are confusing
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Invoice #${invoice.invoice_number}`,
          text: `Here is the invoice for ${invoice.order.client_name}.`,
        });
        return; // Success
      } catch (error) {
        console.log("Share API failed or cancelled", error);
        // Fallthrough to fallback
      }
    }

    // 3. Fallback (Desktop / Share Failed): Download + Link
    // Auto-download the file so the user has it ready to attach
    pdf.save(filename);

    const { order } = invoice;
    let message = `*HOUSE OF NOODLES - Invoice #${invoice.invoice_number}*\n`;
    message += `Customer: ${order.client_name}\n`;
    message += `Total: ₹${invoice.total_amount}\n\n`;
    message += `(The detailed invoice PDF has been attached to this chat.)`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) return (
    <div className="fixed inset-0 bg-brand-black/20 flex items-center justify-center z-50">
      <div className="bg-white p-6 border border-gray-200 shadow-xl">
        <div className="text-sm font-bold uppercase tracking-wider">Loading Invoice...</div>
      </div>
    </div>
  );

  if (!invoice) return (
    <div className="fixed inset-0 bg-brand-black/20 flex items-center justify-center z-50">
      <div className="bg-white p-6 border border-gray-200 shadow-xl">
        <div className="text-sm font-bold uppercase tracking-wider text-red-600">No invoice found</div>
        <button onClick={onClose} className="mt-4 uppercase text-xs font-bold underline">Close</button>
      </div>
    </div>
  );

  const { order } = invoice;
  const { order_items } = order;

  return (
    <div className="fixed inset-0 bg-brand-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm print:p-0 print:bg-white print:block print:inset-auto print:static">
      <div className="bg-white border border-gray-200 shadow-2xl w-full max-w-lg relative flex flex-col max-h-[90vh] print:shadow-none print:border-none print:max-w-none print:w-full print:max-h-none">

        {/* Printable Area */}
        <div ref={invoiceRef} className="p-8 bg-white flex-grow overflow-auto print-only print:overflow-visible print:p-0">
          <div className="border-b-2 border-black pb-6 mb-6">
            <div className="flex justify-between items-end">
              <div>
                <img src={logo} alt="House of Noodles Logo" className="h-16 w-auto mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Cash Memo</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invoice No.</p>
                <p className="text-xl font-mono font-bold">{invoice.invoice_number}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Customer</p>
                <p className="font-bold text-lg">{order.client_name}</p>
                {order.client_phone && <p className="font-mono text-xs">{order.client_phone}</p>}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Date Issued</p>
                <p className="font-mono text-sm">{new Date(invoice.issue_date).toLocaleDateString()}</p>
                <div className="mt-4">
                  <span className={`inline-block px-2 py-1 text-[10px] font-bold uppercase border ${invoice.status === 'paid' ? 'border-green-600 text-green-700' : 'border-red-500 text-red-600'
                    }`}>
                    {invoice.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Itemized List */}
            <div className="mt-8">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black">
                    <th className="py-2 text-[10px] font-bold uppercase text-gray-500 w-1/2">Item</th>
                    <th className="py-2 text-[10px] font-bold uppercase text-gray-500 text-right">Qty</th>
                    <th className="py-2 text-[10px] font-bold uppercase text-gray-500 text-right">Rate</th>
                    <th className="py-2 text-[10px] font-bold uppercase text-gray-500 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order_items && order_items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 text-sm font-bold uppercase">{item.item_name}</td>
                      <td className="py-2 text-sm font-mono text-right">{item.quantity}</td>
                      <td className="py-2 text-sm font-mono text-right">₹{item.price}</td>
                      <td className="py-2 text-sm font-mono font-bold text-right">₹{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t-2 border-black pt-4 mt-4">
              <div className="flex justify-between items-center text-xl font-black">
                <span className="uppercase text-black">Grand Total</span>
                <span className="font-mono text-black">₹{invoice.total_amount?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-[10px] font-bold uppercase text-gray-300 tracking-[0.2em]">Thank you for your visit</p>
          </div>
        </div>

        {/* Action Buttons - Non Printable */}
        <div className="p-6 bg-brand-gray border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3 no-print">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 bg-black text-white py-3 uppercase text-xs font-bold tracking-wider hover:bg-gray-800 transition-colors"
          >
            <Printer size={16} /> Print
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-2 bg-white border border-black text-black py-3 uppercase text-xs font-bold tracking-wider hover:bg-gray-50 transition-colors"
          >
            <Download size={16} /> PDF
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center gap-2 bg-green-500 text-white py-3 uppercase text-xs font-bold tracking-wider hover:bg-green-600 transition-colors"
          >
            <Share2 size={16} /> WhatsApp
          </button>

          <button
            onClick={onClose}
            className="sm:col-span-3 mt-2 py-3 border border-transparent text-gray-500 hover:text-red-600 uppercase text-xs font-bold tracking-wider"
          >
            Close
          </button>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-black transition-colors no-print"
        >
          <X size={24} />
        </button>

      </div>
    </div>
  );
};

export default InvoiceModal;
