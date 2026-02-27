import { useStore } from '../store/useStore';


export const useExport = () => {
  const { transactions } = useStore();

  const exportTransactionsToCSV = (startDate: Date, endDate: Date) => {
    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.timestamp);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    if (filteredTransactions.length === 0) {
      alert('No transactions found in the selected date range.');
      return;
    }

    const headers = [
      'ID',
      'Timestamp',
      'Item ID',
      'Item Name',
      'Action',
      'Quantity',
      'Zone',
      'Department',
      'User',
      'Type',
      'Details',
    ];

    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(t => {
        const details = t.details ? JSON.stringify(t.details) : '';
        return [
          t.id,
          new Date(t.timestamp).toLocaleString(),
          t.itemId,
          t.itemName,
          t.action,
          t.qty,
          t.zone,
          t.department,
          t.user,
          t.type,
          details,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `transactions_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return { exportTransactionsToCSV };
};
