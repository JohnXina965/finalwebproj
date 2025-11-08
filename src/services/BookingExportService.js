/**
 * Export bookings to CSV format
 * @param {Array} bookings - Array of booking objects
 * @param {string} filename - Filename for the CSV file
 */
export const exportBookingsToCSV = (bookings, filename = 'bookings.csv') => {
  // CSV headers
  const headers = [
    'Booking ID',
    'Guest Name',
    'Guest Email',
    'Listing Title',
    'Check-In',
    'Check-Out',
    'Guests',
    'Status',
    'Total Amount',
    'Payment Method',
    'Created At',
    'Confirmed At'
  ];

  // Convert bookings to CSV rows
  const rows = bookings.map(booking => {
    const checkIn = booking.checkIn instanceof Date 
      ? booking.checkIn 
      : (booking.checkIn?.toDate ? booking.checkIn.toDate() : new Date(booking.checkIn));
    const checkOut = booking.checkOut instanceof Date 
      ? booking.checkOut 
      : (booking.checkOut?.toDate ? booking.checkOut.toDate() : new Date(booking.checkOut));
    const createdAt = booking.createdAt instanceof Date 
      ? booking.createdAt 
      : (booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt));
    const confirmedAt = booking.confirmedAt instanceof Date 
      ? booking.confirmedAt 
      : (booking.confirmedAt?.toDate ? booking.confirmedAt.toDate() : null);

    return [
      booking.id || '',
      booking.guestName || '',
      booking.guestEmail || '',
      booking.listingTitle || '',
      checkIn.toLocaleDateString('en-US'),
      checkOut ? checkOut.toLocaleDateString('en-US') : 'N/A',
      booking.guests || 1,
      booking.status || 'pending',
      `₱${parseFloat(booking.totalAmount || 0).toFixed(2)}`,
      booking.paymentMethod || 'N/A',
      createdAt.toLocaleDateString('en-US'),
      confirmedAt ? confirmedAt.toLocaleDateString('en-US') : 'N/A'
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });

  // Combine headers and rows
  const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


