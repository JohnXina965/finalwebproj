import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontSize: 10,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 15,
    color: '#666666',
  },
  summary: {
    marginTop: 15,
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F1F8F4',
    borderRadius: 5,
  },
  summaryText: {
    fontSize: 11,
    marginBottom: 3,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableHeader: {
    backgroundColor: '#C8E6C9',
    fontWeight: 'bold',
    paddingVertical: 8,
  },
  tableCell: {
    fontSize: 9,
    paddingHorizontal: 4,
    flex: 1,
  },
  tableCellId: {
    fontSize: 8,
    paddingHorizontal: 4,
    flex: 0.8,
  },
  tableCellAmount: {
    fontSize: 9,
    paddingHorizontal: 4,
    flex: 1.2,
  },
});

const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = date instanceof Date 
    ? date 
    : (date?.toDate ? date.toDate() : (date?.seconds ? new Date(date.seconds * 1000) : new Date(date)));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const BookingsPDFDocument = ({ bookings, filters = {} }) => {
  const totalRevenue = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0);

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Bookings Report</Text>
        <Text style={styles.subtitle}>
          Generated on {new Date().toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>Total Bookings: {totalBookings}</Text>
          <Text style={styles.summaryText}>Confirmed/Completed: {confirmedBookings}</Text>
          <Text style={styles.summaryText}>Total Revenue: ₱{totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>

        <View style={styles.table}>
          {/* Header Row */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCellId}>ID</Text>
            <Text style={styles.tableCell}>Guest</Text>
            <Text style={styles.tableCell}>Listing</Text>
            <Text style={styles.tableCell}>Check-In</Text>
            <Text style={styles.tableCell}>Check-Out</Text>
            <Text style={styles.tableCell}>Status</Text>
            <Text style={styles.tableCellAmount}>Amount</Text>
          </View>

          {/* Data Rows */}
          {bookings.map((booking) => (
            <View key={booking.id} style={styles.tableRow}>
              <Text style={styles.tableCellId}>{booking.id.substring(0, 8)}...</Text>
              <Text style={styles.tableCell}>{booking.guestName || 'N/A'}</Text>
              <Text style={styles.tableCell}>{booking.listingTitle || 'N/A'}</Text>
              <Text style={styles.tableCell}>{formatDate(booking.checkIn)}</Text>
              <Text style={styles.tableCell}>{formatDate(booking.checkOut)}</Text>
              <Text style={styles.tableCell}>{booking.status || 'pending'}</Text>
              <Text style={styles.tableCellAmount}>₱{parseFloat(booking.totalAmount || 0).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

export default BookingsPDFDocument;

