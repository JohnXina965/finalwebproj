import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../Firebase';
import { collection, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

function AdminReports() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('bookings');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/admin/login');
      return;
    }

    checkAdminAccess();
  }, [currentUser, navigate]);

  const checkAdminAccess = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        navigate('/admin/login');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/admin/login');
    }
  };

  const generateCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle dates, arrays, and special characters
          if (value instanceof Date) {
            return value.toLocaleDateString('en-US');
          }
          if (Array.isArray(value)) {
            return value.join('; ');
          }
          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
          }
          // Escape commas and quotes
          return `"${String(value || '').replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`✅ ${filename} report exported successfully!`);
  };

  const generatePDF = async (data, filename) => {
    // For PDF generation, we'll use a simple HTML-to-PDF approach
    // In production, you might want to use a library like jsPDF or pdfmake
    
    toast.info('PDF generation is being prepared. For now, please use CSV export.');
    
    // Simple HTML table approach
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${filename} Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #4CAF50; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>${filename} Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${headers.map(header => {
                  const value = row[header];
                  if (value instanceof Date) {
                    return `<td>${value.toLocaleDateString('en-US')}</td>`;
                  }
                  return `<td>${String(value || '')}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`✅ ${filename} report exported as HTML!`);
  };

  const loadBookingsReport = async () => {
    try {
      setLoading(true);
      const bookingsSnapshot = await getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')));
      
      const bookings = bookingsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          'Booking ID': doc.id,
          'Guest Name': data.guestName || 'N/A',
          'Guest Email': data.guestEmail || 'N/A',
          'Host Name': data.hostName || 'N/A',
          'Listing Title': data.listingTitle || 'N/A',
          'Check-in': data.checkIn?.toDate ? data.checkIn.toDate().toLocaleDateString() : 'N/A',
          'Check-out': data.checkOut?.toDate ? data.checkOut.toDate().toLocaleDateString() : 'N/A',
          'Guests': data.guests || 0,
          'Total Amount': `₱${(data.totalAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          'Service Fee': `₱${(data.serviceFee || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          'Status': data.status || 'pending',
          'Payment Status': data.paymentStatus || 'pending',
          'Payment Method': data.paymentMethod || 'N/A',
          'Created At': data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : 'N/A'
        };
      });

      setReportData(bookings);
      toast.success(`✅ Loaded ${bookings.length} bookings`);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings report');
    } finally {
      setLoading(false);
    }
  };

  const loadHostsReport = async () => {
    try {
      setLoading(true);
      const usersSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'host')));
      
      const hosts = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        // Get listings count
        const listingsSnapshot = await getDocs(query(collection(db, 'listings'), where('hostId', '==', userDoc.id)));
        
        // Get bookings count
        const bookingsSnapshot = await getDocs(query(collection(db, 'bookings'), where('hostId', '==', userDoc.id)));
        
        // Get total earnings
        let totalEarnings = 0;
        bookingsSnapshot.forEach(bookingDoc => {
          const booking = bookingDoc.data();
          if (booking.status === 'completed' || booking.status === 'confirmed') {
            const serviceFee = booking.serviceFee || 0;
            totalEarnings += (booking.totalAmount || 0) - serviceFee;
          }
        });

        hosts.push({
          'Host ID': userDoc.id,
          'Name': userData.displayName || userData.name || 'N/A',
          'Email': userData.email || 'N/A',
          'Phone': userData.phoneNumber || 'N/A',
          'Listings Count': listingsSnapshot.size,
          'Bookings Count': bookingsSnapshot.size,
          'Total Earnings': `₱${totalEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          'Subscription Plan': userData.subscriptionPlan || 'None',
          'Subscription Status': userData.subscriptionStatus || 'None',
          'Joined Date': userData.createdAt?.toDate ? userData.createdAt.toDate().toLocaleDateString() : 'N/A'
        });
      }

      setReportData(hosts);
      toast.success(`✅ Loaded ${hosts.length} hosts`);
    } catch (error) {
      console.error('Error loading hosts:', error);
      toast.error('Failed to load hosts report');
    } finally {
      setLoading(false);
    }
  };

  const loadGuestsReport = async () => {
    try {
      setLoading(true);
      const usersSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'guest')));
      
      const guests = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        // Get bookings count
        const bookingsSnapshot = await getDocs(query(collection(db, 'bookings'), where('guestId', '==', userDoc.id)));
        
        // Get total spent
        let totalSpent = 0;
        bookingsSnapshot.forEach(bookingDoc => {
          const booking = bookingDoc.data();
          totalSpent += booking.totalAmount || 0;
        });

        guests.push({
          'Guest ID': userDoc.id,
          'Name': userData.displayName || userData.name || 'N/A',
          'Email': userData.email || 'N/A',
          'Phone': userData.phoneNumber || 'N/A',
          'Bookings Count': bookingsSnapshot.size,
          'Total Spent': `₱${totalSpent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          'Joined Date': userData.createdAt?.toDate ? userData.createdAt.toDate().toLocaleDateString() : 'N/A'
        });
      }

      setReportData(guests);
      toast.success(`✅ Loaded ${guests.length} guests`);
    } catch (error) {
      console.error('Error loading guests:', error);
      toast.error('Failed to load guests report');
    } finally {
      setLoading(false);
    }
  };

  const loadRevenueReport = async () => {
    try {
      setLoading(true);
      const { calculateServiceFee } = require('../services/ServiceFeeService');
      
      // Get subscription revenue
      const usersSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'host')));
      const subscriptions = [];
      let totalSubscriptionRevenue = 0;
      
      usersSnapshot.forEach(userDoc => {
        const userData = userDoc.data();
        if (userData.subscriptionPlan && userData.subscriptionStatus === 'active') {
          const planPrice = getPlanPrice(userData.subscriptionPlan);
          totalSubscriptionRevenue += planPrice;
          subscriptions.push({
            'Host Name': userData.displayName || userData.email || 'N/A',
            'Plan': userData.subscriptionPlan,
            'Amount': `₱${planPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
            'Status': userData.subscriptionStatus || 'active',
            'Date': userData.subscriptionStartDate?.toDate ? userData.subscriptionStartDate.toDate().toLocaleDateString() : 'N/A'
          });
        }
      });

      // Get service fee revenue
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const serviceFees = [];
      let totalServiceFeeRevenue = 0;
      
      bookingsSnapshot.forEach(bookingDoc => {
        const booking = bookingDoc.data();
        const serviceFee = booking.serviceFee || calculateServiceFee(booking.totalAmount || 0);
        totalServiceFeeRevenue += serviceFee;
        
        serviceFees.push({
          'Booking ID': bookingDoc.id,
          'Guest': booking.guestName || 'N/A',
          'Host': booking.hostName || 'N/A',
          'Listing': booking.listingTitle || 'N/A',
          'Total Amount': `₱${(booking.totalAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          'Service Fee': `₱${serviceFee.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          'Date': booking.createdAt?.toDate ? booking.createdAt.toDate().toLocaleDateString() : 'N/A'
        });
      });

      const revenue = [
        {
          'Revenue Type': 'Subscriptions',
          'Total': `₱${totalSubscriptionRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          'Count': subscriptions.length
        },
        {
          'Revenue Type': 'Service Fees',
          'Total': `₱${totalServiceFeeRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          'Count': serviceFees.length
        },
        {
          'Revenue Type': 'Total Revenue',
          'Total': `₱${(totalSubscriptionRevenue + totalServiceFeeRevenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          'Count': subscriptions.length + serviceFees.length
        }
      ];

      setReportData(revenue);
      toast.success('✅ Revenue report loaded');
    } catch (error) {
      console.error('Error loading revenue:', error);
      toast.error('Failed to load revenue report');
    } finally {
      setLoading(false);
    }
  };

  const getPlanPrice = (plan) => {
    const prices = {
      basic: 99,
      professional: 299,
      enterprise: 999
    };
    return prices[plan.toLowerCase()] || 0;
  };

  const handleGenerateReport = async () => {
    switch (reportType) {
      case 'bookings':
        await loadBookingsReport();
        break;
      case 'hosts':
        await loadHostsReport();
        break;
      case 'guests':
        await loadGuestsReport();
        break;
      case 'revenue':
        await loadRevenueReport();
        break;
      default:
        toast.error('Please select a report type');
    }
  };

  const handleExport = (format) => {
    if (!reportData || reportData.length === 0) {
      toast.error('Please generate a report first');
      return;
    }

    const filename = `${reportType}_report`;
    
    if (format === 'csv') {
      generateCSV(reportData, filename);
    } else {
      generatePDF(reportData, filename);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:ml-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Report Generation</h1>
          <p className="text-gray-600">Generate and export reports for bookings, hosts, guests, and revenue</p>
        </div>

        {/* Report Type Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Report Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'bookings', label: 'Bookings', icon: '📅' },
              { id: 'hosts', label: 'Hosts', icon: '🏠' },
              { id: 'guests', label: 'Guests', icon: '👤' },
              { id: 'revenue', label: 'Revenue', icon: '💰' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setReportType(type.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  reportType === type.id
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-2xl mb-2">{type.icon}</div>
                <div className="font-semibold">{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range (Optional) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Date Range (Optional)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>

        {/* Report Preview */}
        {reportData && reportData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Report Preview ({reportData.length} {reportData.length === 1 ? 'record' : 'records'})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Export PDF
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(reportData[0]).map(header => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {Object.values(row).map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportData.length > 10 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Showing first 10 of {reportData.length} records. Export to see all data.
                </p>
              )}
            </div>
          </div>
        )}

        {!reportData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Report Generated</h3>
            <p className="text-gray-600">Select a report type and click "Generate Report" to get started</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

export default AdminReports;

