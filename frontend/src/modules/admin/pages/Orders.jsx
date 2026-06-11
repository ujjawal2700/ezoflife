import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, Download, Filter, FileText, PlusCircle, ExternalLink, User, Store, Calendar, ArrowRight, Eye, Edit3, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { mockAdminData } from '../data/mockData';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';
import StatusBadge from '../components/common/StatusBadge';
import { orderApi, adminApi } from '../../../lib/api';

export default function Orders() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const tabs = useMemo(() => ['All', 'Placed', 'Processing', 'Delivered', 'Cancelled'], []);

  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      const res = await orderApi.getAllOrders();
      setAllOrders(res);
    } catch (err) {
      console.error('Fetch all orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      await orderApi.deleteOrder(id);
      setAllOrders(prev => prev.filter(order => order._id !== id));
      alert('Order deleted successfully');
    } catch (err) {
      console.error('Delete order error:', err);
      alert('Error deleting order');
    }
  };

  const handleUpdateStatus = async (id, currentStatus) => {
      const nextStatuses = ['ORDER_PLACED', 'PICKUP_ASSIGNED', 'RIDER_ARRIVING', 'IN_TRANSIT', 'RECEIVED_BY_VENDOR', 'PROCESSING', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
      const newStatus = window.prompt(`Update status for order ${id}. Choices: ${nextStatuses.join(', ')}`, currentStatus);
      
      if (newStatus && nextStatuses.includes(newStatus)) {
          try {
              await orderApi.updateOrderStatus(id, newStatus);
              setAllOrders(prev => prev.map(order => 
                  order._id === id ? { ...order, status: newStatus } : order
              ));
              alert('Status updated');
          } catch (err) {
              console.error('Update status error:', err);
              alert('Error updating status');
          }
      }
  };

  const handleExportPDF = () => {
    console.log('Exporting PDF for:', activeTab);
    const doc = new jsPDF();
    
    // Add Branding / Header
    doc.setFontSize(20);
    doc.text('EZOFLIFE - ORDER REPORT', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Category: ${activeTab} Orders`, 14, 35);
    
    // Prepare Table Data
    const tableColumn = ["Order ID", "Customer", "Vendor", "Amount", "Status", "Date"];
    const tableRows = filteredOrders.map(order => [
      order.orderId || order._id.slice(-6).toUpperCase(),
      order.customer?.displayName || 'Unknown',
      order.vendor?.shopDetails?.shopName || 'N/A',
      `Rs. ${order.totalAmount}`,
      order.status,
      new Date(order.createdAt).toLocaleDateString()
    ]);
    
    // Generate Table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      styles: { fontSize: 8, font: 'helvetica' },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 }, // Slate-900
      alternateRowStyles: { fillColor: [248, 250, 252] } // Slate-50
    });
    
    doc.save(`EzofLife_Orders_${activeTab}_${new Date().getTime()}.pdf`);
    console.log('PDF Download Started');
  };

  const handleClearAllOrders = async () => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete ALL orders from the system. This action cannot be undone. Are you sure?')) return;
    
    try {
        setLoading(true);
        const result = await adminApi.clearAllOrders();
        if (result.message) {
            setAllOrders([]);
            alert(result.message);
        } else {
            throw new Error('Invalid response from server');
        }
    } catch (err) {
        console.error('Clear all orders error:', err);
        alert(`Failed to clear orders: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (activeTab === 'All') return allOrders;
    if (activeTab === 'Placed') return allOrders.filter(o => o.status === 'ORDER_PLACED');
    if (activeTab === 'Processing') return allOrders.filter(o => ['PICKUP_ASSIGNED', 'RIDER_ARRIVING', 'IN_TRANSIT', 'RECEIVED_BY_VENDOR', 'PROCESSING', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY'].includes(o.status));
    if (activeTab === 'Delivered') return allOrders.filter(o => o.status === 'DELIVERED');
    if (activeTab === 'Cancelled') return allOrders.filter(o => o.status === 'CANCELLED');
    return allOrders;
  }, [activeTab, allOrders]);

  const orderColumns = useMemo(() => [
    { 
      header: 'Order ID', 
      key: 'orderId',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 text-[11px] tracking-[0.1em] uppercase leading-none mb-1 group-hover:text-blue-600 transition-colors">{val}</span>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80 tabular-nums">Service Request</span>
        </div>
      )
    },
    { 
      header: 'Customer', 
      key: 'customer',
      render: (val) => (
        <div className="flex items-center gap-2 transition-transform">
          <div className="w-6 h-6 rounded-sm bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-200 text-[8px] font-bold uppercase">
            {val?.displayName?.charAt(0) || 'U'}
          </div>
          <span className="font-bold text-slate-800 text-[10px] uppercase tracking-tight">{val?.displayName || 'Unknown'}</span>
        </div>
      )
    },
    { 
      header: 'Vendor', 
      key: 'vendor',
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm bg-slate-950 text-white flex items-center justify-center border border-slate-800 text-[8px] font-bold uppercase">
             <Store size={10} />
          </div>
          <span className="font-bold text-slate-700 text-[10px] uppercase tracking-tighter tabular-nums">{val?.shopDetails?.name || 'Unassigned'}</span>
        </div>
      )
    },
    { 
      header: 'Amount', 
      key: 'totalAmount', 
      align: 'right', 
      render: (val) => <span className="font-bold text-slate-900 tabular-nums text-xs">₹{val?.toLocaleString() || 0}</span> 
    },
    { 
      header: 'Status', 
      key: 'status', 
      render: (val) => <StatusBadge status={val} /> 
    },
    { 
      header: 'Date', 
      key: 'createdAt', 
      render: (val) => <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest tabular-nums opacity-60 flex items-center gap-2"><ArrowRight size={10} className="text-slate-200" /> {new Date(val).toLocaleDateString()}</span> 
    },
    {
      header: 'Actions',
      key: '_id',
      align: 'right',
      render: (val, row) => (
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={() => navigate(`/admin/orders/${val}`)}
            className="p-1.5 hover:bg-slate-100 rounded-sm text-slate-400 hover:text-blue-600 transition-all"
            title="View Details"
          >
            <Eye size={14} />
          </button>
          <button 
            onClick={() => handleUpdateStatus(val, row.status)}
            className="p-1.5 hover:bg-slate-100 rounded-sm text-slate-400 hover:text-amber-600 transition-all"
            title="Update Status"
          >
            <Edit3 size={14} />
          </button>
          <button 
            onClick={() => handleDeleteOrder(val)}
            className="p-1.5 hover:bg-slate-100 rounded-sm text-slate-400 hover:text-red-600 transition-all"
            title="Delete Order"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ], []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
      <PageHeader 
        title="Orders" 
        actions={[
          { label: 'Clear All Orders', icon: Trash2, variant: 'secondary', onClick: handleClearAllOrders },
          { label: 'Export Order List', icon: FileText, variant: 'secondary', onClick: handleExportPDF },
          { label: 'Create Manual Order', icon: PlusCircle, variant: 'primary' }
        ]}
      />

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Navigation Filters */}
        <div className="flex bg-white p-1 rounded-sm w-fit border border-slate-200 relative z-10">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-sm text-[9px] font-bold uppercase tracking-[0.25em] transition-all duration-300 ${
                activeTab === tab 
                  ? 'bg-slate-900 text-white z-10 translate-y-[-1px]' 
                  : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Order List */}
        <DataGrid 
          title={`${activeTab} Orders`}
          columns={orderColumns}
          data={filteredOrders}
          onAction={(row) => navigate(`/admin/orders/${row.id}`)}
        />
      </div>
    </div>
  );
}
