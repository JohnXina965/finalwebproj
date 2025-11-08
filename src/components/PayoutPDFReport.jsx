import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff'
  },
  header: {
    marginBottom: 30,
    paddingBottom: 15,
    borderBottom: '2 solid #f97316'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 5
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    minHeight: 30,
    alignItems: 'center'
  },
  tableHeader: {
    backgroundColor: '#f97316',
    color: '#ffffff',
    fontWeight: 'bold'
  },
  tableCell: {
    padding: 8,
    fontSize: 9,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    borderRightStyle: 'solid'
  },
  tableCellNumber: {
    width: '5%',
    textAlign: 'center'
  },
  tableCellType: {
    width: '10%',
    textAlign: 'center'
  },
  tableCellName: {
    width: '15%'
  },
  tableCellListing: {
    width: '12%',
    fontFamily: 'Courier'
  },
  tableCellAmount: {
    width: '12%',
    textAlign: 'right',
    fontWeight: 'bold'
  },
  tableCellDate: {
    width: '15%'
  },
  tableCellStatus: {
    width: '12%',
    textAlign: 'center'
  },
  tableCellAction: {
    width: '9%',
    textAlign: 'center'
  },
  statusBadge: {
    padding: 4,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    color: '#92400e'
  },
  statusOnHold: {
    backgroundColor: '#f3f4f6',
    color: '#374151'
  },
  statusReleased: {
    backgroundColor: '#d1fae5',
    color: '#065f46'
  },
  statusRefunded: {
    backgroundColor: '#fee2e2',
    color: '#991b1b'
  },
  summary: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    border: '1 solid #e5e7eb'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid'
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: 'bold'
  },
  summaryValue: {
    fontSize: 11,
    color: '#1f2937',
    fontWeight: 'bold'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10
  }
});

// Format date for PDF
const formatDate = (date) => {
  if (!date) return 'N/A';
  const dateObj = date?.toDate ? date.toDate() : new Date(date);
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get status badge style
const getStatusStyle = (status) => {
  switch (status) {
    case 'PENDING':
      return styles.statusPending;
    case 'ON_HOLD':
      return styles.statusOnHold;
    case 'RELEASED':
      return styles.statusReleased;
    case 'REFUNDED':
      return styles.statusRefunded;
    default:
      return styles.statusPending;
  }
};

// PDF Document Component
const PayoutPDFDocument = ({ payouts, filter, generatedDate }) => {
  // Calculate summary
  const totalPayouts = payouts.length;
  const totalAmount = payouts.reduce((sum, payout) => sum + (payout.amount || 0), 0);
  const pendingCount = payouts.filter(p => p.payoutStatus === 'PENDING' || p.payoutStatus === 'ON_HOLD').length;
  const releasedCount = payouts.filter(p => p.payoutStatus === 'RELEASED').length;
  const refundedCount = payouts.filter(p => p.payoutStatus === 'REFUNDED').length;
  const pendingAmount = payouts
    .filter(p => p.payoutStatus === 'PENDING' || p.payoutStatus === 'ON_HOLD')
    .reduce((sum, payout) => sum + (payout.amount || 0), 0);
  const releasedAmount = payouts
    .filter(p => p.payoutStatus === 'RELEASED')
    .reduce((sum, payout) => sum + (payout.amount || 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Payout Control Center Report</Text>
          <Text style={styles.subtitle}>
            Generated on: {generatedDate.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
          <Text style={styles.subtitle}>
            Filter: {filter === 'all' ? 'All Payouts' : filter === 'pending' ? 'Pending / On Hold' : 'Released'}
          </Text>
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Payouts:</Text>
              <Text style={styles.summaryValue}>{totalPayouts}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount:</Text>
              <Text style={styles.summaryValue}>₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pending / On Hold:</Text>
              <Text style={styles.summaryValue}>{pendingCount} (₱{pendingAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })})</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Released:</Text>
              <Text style={styles.summaryValue}>{releasedCount} (₱{releasedAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })})</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Refunded:</Text>
              <Text style={styles.summaryValue}>{refundedCount}</Text>
            </View>
          </View>
        </View>

        {/* Payouts Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payout Records</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.tableCellNumber]}>#</Text>
              <Text style={[styles.tableCell, styles.tableCellType]}>Type</Text>
              <Text style={[styles.tableCell, styles.tableCellName]}>Host</Text>
              <Text style={[styles.tableCell, styles.tableCellName]}>Guest</Text>
              <Text style={[styles.tableCell, styles.tableCellListing]}>Listing ID</Text>
              <Text style={[styles.tableCell, styles.tableCellAmount]}>Amount</Text>
              <Text style={[styles.tableCell, styles.tableCellDate]}>Due Date</Text>
              <Text style={[styles.tableCell, styles.tableCellStatus]}>Status</Text>
            </View>

            {/* Table Rows */}
            {payouts.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '100%', textAlign: 'center', padding: 20, borderRightWidth: 0 }]}>
                  No payout records found
                </Text>
              </View>
            ) : (
              payouts.map((payout, index) => (
                <View key={payout.id || index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableCellNumber]}>{index + 1}</Text>
                <Text style={[styles.tableCell, styles.tableCellType]}>{payout.type || 'Place'}</Text>
                <Text style={[styles.tableCell, styles.tableCellName]}>{payout.hostName || 'N/A'}</Text>
                <Text style={[styles.tableCell, styles.tableCellName]}>{payout.guestName || 'N/A'}</Text>
                <Text style={[styles.tableCell, styles.tableCellListing]}>
                  {payout.listingId ? payout.listingId.substring(0, 8) + '...' : 'N/A'}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellAmount]}>
                  ₱{payout.amount?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellDate]}>
                  {formatDate(payout.dueDate)}
                </Text>
                <View style={[styles.tableCell, styles.tableCellStatus]}>
                  <View style={[styles.statusBadge, getStatusStyle(payout.payoutStatus)]}>
                    <Text>{payout.payoutStatus || 'PENDING'}</Text>
                  </View>
                </View>
              </View>
              ))
            )}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          EcoExpress - Payout Control Center Report | Page 1
        </Text>
      </Page>
    </Document>
  );
};

export default PayoutPDFDocument;

