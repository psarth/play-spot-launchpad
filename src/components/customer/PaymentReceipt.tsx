import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, CheckCircle } from "lucide-react";

interface ReceiptData {
  bookingId: string;
  venueName: string;
  venueLocation: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  paymentStatus: string;
  transactionId?: string;
  customerName?: string;
  sportName?: string;
  tableCourtName?: string;
}

interface PaymentReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptData;
}

const PaymentReceipt = ({ open, onOpenChange, receipt }: PaymentReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt - ${receipt.bookingId.slice(0, 8)}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; max-width: 500px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
            .receipt-title { font-size: 14px; color: #666; margin-top: 8px; }
            .success-badge { display: inline-flex; align-items: center; gap: 6px; background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px; margin: 16px 0; }
            .details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .row:last-child { border-bottom: none; }
            .label { color: #666; }
            .value { font-weight: 500; }
            .total-row { font-size: 18px; font-weight: bold; border-top: 2px solid #e5e7eb; padding-top: 16px; margin-top: 8px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">SportSpot</div>
            <div class="receipt-title">Payment Receipt</div>
            <div class="success-badge">✓ Payment Successful</div>
          </div>
          <div class="details">
            <div class="row">
              <span class="label">Booking ID</span>
              <span class="value">${receipt.bookingId.slice(0, 8).toUpperCase()}</span>
            </div>
            <div class="row">
              <span class="label">Venue</span>
              <span class="value">${receipt.venueName}</span>
            </div>
            <div class="row">
              <span class="label">Location</span>
              <span class="value">${receipt.venueLocation}</span>
            </div>
            <div class="row">
              <span class="label">Date</span>
              <span class="value">${new Date(receipt.bookingDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
            <div class="row">
              <span class="label">Time</span>
              <span class="value">${receipt.startTime.slice(0, 5)} - ${receipt.endTime.slice(0, 5)}</span>
            </div>
            <div class="row">
              <span class="label">Transaction ID</span>
              <span class="value">${receipt.transactionId || "N/A"}</span>
            </div>
            <div class="row total-row">
              <span class="label">Amount Paid</span>
              <span class="value" style="color: #166534;">₹${receipt.totalAmount}</span>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for booking with SportSpot!</p>
            <p>This is a computer-generated receipt.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = () => {
    // Create a simple text-based receipt for download
    const receiptText = `
SPORTSPOT - PAYMENT RECEIPT
============================

Booking ID: ${receipt.bookingId.slice(0, 8).toUpperCase()}
Status: Payment Successful

BOOKING DETAILS
---------------
Venue: ${receipt.venueName}
Location: ${receipt.venueLocation}
Date: ${new Date(receipt.bookingDate).toLocaleDateString("en-IN")}
Time: ${receipt.startTime.slice(0, 5)} - ${receipt.endTime.slice(0, 5)}

PAYMENT DETAILS
---------------
Transaction ID: ${receipt.transactionId || "N/A"}
Amount Paid: ₹${receipt.totalAmount}
Payment Status: ${receipt.paymentStatus}

============================
Thank you for booking with SportSpot!
    `.trim();

    const blob = new Blob([receiptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${receipt.bookingId.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Payment Receipt</DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="space-y-6 py-4">
          {/* Success Badge */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-success/20 text-success px-4 py-2 rounded-full">
              <CheckCircle className="h-5 w-5" />
              Payment Successful
            </div>
          </div>

          {/* Receipt Details */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Booking ID</span>
              <span className="font-mono font-semibold">{receipt.bookingId.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Venue</span>
              <span className="font-semibold">{receipt.venueName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Location</span>
              <span>{receipt.venueLocation}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span>{new Date(receipt.bookingDate).toLocaleDateString("en-IN", { 
                weekday: "short", 
                day: "numeric", 
                month: "short", 
                year: "numeric" 
              })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Time</span>
              <span>{receipt.startTime.slice(0, 5)} - {receipt.endTime.slice(0, 5)}</span>
            </div>
            {receipt.transactionId && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-mono text-xs">{receipt.transactionId}</span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Amount Paid</span>
              <span className="text-success">₹{receipt.totalAmount}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handlePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleDownload} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentReceipt;
