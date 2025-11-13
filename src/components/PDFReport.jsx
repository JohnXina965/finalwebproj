import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #10b981',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    minHeight: 30,
  },
  tableHeader: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 8,
    fontSize: 9,
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    borderRightStyle: 'solid',
  },
  tableCellHeader: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10,
  },
});

const PDFReport = ({ data, filename, reportType }) => {
  if (!data || data.length === 0) {
    return null;
  }

  const headers = Object.keys(data[0]);
  const formatValue = (value) => {
    if (value instanceof Date) {
      return value.toLocaleDateString('en-US');
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value || '');
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{filename} Report</Text>
          <Text style={styles.subtitle}>
            Report Type: {reportType} | Generated: {new Date().toLocaleString()}
          </Text>
        </View>

        <View style={styles.table}>
          {/* Header Row */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            {headers.map((header, index) => (
              <Text key={index} style={[styles.tableCell, styles.tableCellHeader]}>
                {header.charAt(0).toUpperCase() + header.slice(1).replace(/([A-Z])/g, ' $1')}
              </Text>
            ))}
          </View>

          {/* Data Rows */}
          {data.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.tableRow}>
              {headers.map((header, cellIndex) => (
                <Text key={cellIndex} style={styles.tableCell}>
                  {formatValue(row[header])}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text>EcoExpress Platform Management System | Page 1</Text>
        </View>
      </Page>
    </Document>
  );
};

export default PDFReport;

