import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: "#0F172A", fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  brand: { fontSize: 22, fontWeight: 700, color: "#2F5BFF", letterSpacing: 1 },
  tagline: { fontSize: 9, color: "#64748B", marginTop: 2 },
  invoiceLabel: { fontSize: 14, fontWeight: 700, textAlign: "right" },
  invoiceMeta: { fontSize: 9, color: "#64748B", textAlign: "right", marginTop: 2 },

  divider: { borderBottomWidth: 1, borderBottomColor: "#E2E8F0", marginVertical: 12 },

  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  colLabel: { fontSize: 8, color: "#64748B", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  colValue: { fontSize: 10, color: "#0F172A", lineHeight: 1.45 },

  table: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#CBD5E1", marginTop: 6 },
  thead: { flexDirection: "row", backgroundColor: "#F1F5F9", paddingVertical: 6, paddingHorizontal: 8 },
  th: { fontSize: 8, fontWeight: 700, color: "#0F172A", textTransform: "uppercase", letterSpacing: 1 },
  thDesc: { flex: 3 },
  thAmount: { flex: 1, textAlign: "right" },
  trow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  td: { fontSize: 10, color: "#0F172A" },
  tdDesc: { flex: 3 },
  tdAmount: { flex: 1, textAlign: "right" },

  totals: { marginTop: 12, alignSelf: "flex-end", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalLabel: { fontSize: 10, color: "#64748B" },
  totalValue: { fontSize: 10, fontWeight: 700, color: "#0F172A" },
  grandRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#0F172A", marginTop: 4 },
  grandLabel: { fontSize: 11, fontWeight: 700, color: "#0F172A" },
  grandValue: { fontSize: 13, fontWeight: 700, color: "#2F5BFF" },

  footer: { marginTop: 28, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0", fontSize: 8, color: "#64748B", lineHeight: 1.5 },
});

export type InvoiceProps = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  bookingId: string;
  slotDate: string;
  slotTime: string;
  duration: string;
  courtNumber?: number;
  subtotal: number;
  gst: number;
  total: number;
  venueAddress: string;
  invoiceDate?: string;
};

function fmtMoney(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

export function BookingInvoice(props: InvoiceProps) {
  const {
    customerName,
    customerEmail,
    customerPhone,
    bookingId,
    slotDate,
    slotTime,
    duration,
    courtNumber,
    subtotal,
    gst,
    total,
    venueAddress,
    invoiceDate,
  } = props;

  const dateStr =
    invoiceDate ??
    new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());

  const courtLabel = courtNumber ? ` · Court ${courtNumber}` : "";
  const description = `Pickleball court booking — ${slotDate}, ${slotTime}${courtLabel}, ${duration}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>BREATHE PICKLEBALL</Text>
            <Text style={styles.tagline}>North Kolkata&apos;s home of pickleball</Text>
          </View>
          <View>
            <Text style={styles.invoiceLabel}>TAX INVOICE</Text>
            <Text style={styles.invoiceMeta}>Invoice no. {bookingId}</Text>
            <Text style={styles.invoiceMeta}>Date: {dateStr}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.twoCol}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.colLabel}>Billed to</Text>
            <Text style={styles.colValue}>{customerName}</Text>
            <Text style={styles.colValue}>{customerEmail}</Text>
            {customerPhone && <Text style={styles.colValue}>{customerPhone}</Text>}
          </View>
          <View style={{ flex: 1, paddingLeft: 12 }}>
            <Text style={styles.colLabel}>Venue</Text>
            <Text style={styles.colValue}>Breathe Pickleball</Text>
            <Text style={styles.colValue}>{venueAddress}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, styles.thDesc]}>Description</Text>
            <Text style={[styles.th, styles.thAmount]}>Amount</Text>
          </View>
          <View style={styles.trow}>
            <Text style={[styles.td, styles.tdDesc]}>{description}</Text>
            <Text style={[styles.td, styles.tdAmount]}>{fmtMoney(subtotal)}</Text>
          </View>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmtMoney(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST @18%</Text>
            <Text style={styles.totalValue}>{fmtMoney(gst)}</Text>
          </View>
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Total paid</Text>
            <Text style={styles.grandValue}>{fmtMoney(total)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            This is a computer-generated invoice. For questions, reply to bookings@breathepickleball.in or
            WhatsApp +91 74390 10356.
          </Text>
          <Text>Cancellation: free up to 4 hours before the slot. After that, cancellations are non-refundable.</Text>
          <Text style={{ marginTop: 6 }}>Thank you for playing at Breathe.</Text>
        </View>
      </Page>
    </Document>
  );
}

export default BookingInvoice;
