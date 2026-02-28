import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Receipt,
  Pencil,
  LogOut
} from "lucide-react";
import { useAuth } from "../App";
import {
  getOrders,
  updateOrderPaymentStatus
} from "../services/supabaseService";

import InvoiceModal from "./InvoiceModal";
import ExportModal from "../components/ExportModal";

// Minimal Confirmation Modal
const ConfirmPaymentModal = ({ onConfirm, onCancel, orderDetails }) => {
  return (
    <div className="fixed inset-0 bg-brand-black/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 shadow-xl w-full max-w-md p-6">
        <h2 className="text-2xl font-bold font-display uppercase tracking-wide mb-4 text-brand-black">Confirm Payment</h2>

        <p className="mb-6 text-gray-600">
          Mark this order as paid?
        </p>

        <div className="bg-gray-50 p-4 border border-gray-100 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-500 uppercase text-xs tracking-wider">Customer</span>
            <span className="font-semibold text-brand-black">{orderDetails.client_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 uppercase text-xs tracking-wider">Amount</span>
            <span className="font-bold text-brand-black">
              ₹{orderDetails.total_amount?.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-white border border-gray-300 text-brand-black py-2 hover:bg-gray-50 transition-colors uppercase text-sm font-bold tracking-wider"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-black text-white border border-black py-2 hover:bg-gray-900 transition-colors uppercase text-sm font-bold tracking-wider"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};



const OrderList = () => {
  // State Management
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab State: 'ongoing' or 'completed'
  const [activeTab, setActiveTab] = useState("ongoing");
  const [searchQuery, setSearchQuery] = useState("");
  // Date Filter: 'today', 'yesterday', 'week', 'month', 'all'
  const [dateFilter, setDateFilter] = useState("today");


  const [showExportModal, setShowExportModal] = useState(false);
  const [confirmPaymentOrder, setConfirmPaymentOrder] = useState(null);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [notification, setNotification] = useState(null);

  const { logout, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };


  // Show notification helper
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };



  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const fetchedOrders = await getOrders();
        setOrders(fetchedOrders);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch orders", err);
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);


  const updatePaymentStatus = async (order) => {
    try {
      await updateOrderPaymentStatus(order.id, "Paid");
      setOrders((prevOrders) =>
        prevOrders.map((prevOrder) =>
          prevOrder.id === order.id
            ? { ...prevOrder, payment_status: "Paid" }
            : prevOrder
        )
      );
      showNotification(`Payment collected for ${order.client_name}`);
      setConfirmPaymentOrder(null);
    } catch (err) {
      console.error("Failed to update payment status", err);
      showNotification("Failed to update payment status", "error");
    }
  };

  const processedOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Tab Filter
        const isPaid = order.payment_status === "Paid";
        const matchesTab = activeTab === "completed" ? isPaid : !isPaid;

        // Date Filter
        const orderDate = new Date(order.created_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        let matchesDate = true;

        // Helper dates
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        const lastMonth = new Date(today);
        lastMonth.setDate(lastMonth.getDate() - 30);

        // Normalize order date for day comparison
        const orderDay = new Date(orderDate);
        orderDay.setHours(0, 0, 0, 0);

        switch (dateFilter) {
          case 'today':
            matchesDate = orderDay.getTime() === today.getTime();
            break;
          case 'yesterday':
            matchesDate = orderDay.getTime() === yesterday.getTime();
            break;
          case 'week':
            matchesDate = orderDate >= lastWeek;
            break;
          case 'month':
            matchesDate = orderDate >= lastMonth;
            break;
          case 'all':
          default:
            matchesDate = true;
            break;
        }

        // Search Filter
        const matchesSearch =
          searchQuery === "" ||
          order.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (order.invoice_number && order.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesTab && matchesDate && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB - dateA; // Always newest first
      });
  }, [orders, activeTab, dateFilter, searchQuery]);

  // Helper to format order items for display
  const formatOrderItems = (order) => {
    if (!order.order_items || order.order_items.length === 0) return "No items";
    const summary = order.order_items.map(item => `${item.item_name} x${item.quantity}`).join(", ");
    return summary.length > 50 ? summary.substring(0, 50) + "..." : summary;
  };

  // ADVANCED CSV Export Logic
  const handleExportData = (type, startDate, endDate) => {
    // Filter orders based on chosen date range
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= start && orderDate <= end;
    });

    if (filteredOrders.length === 0) {
      showNotification("No orders found for selected criteria", "error");
      return;
    }

    let headers = [];
    let rows = [];
    let filename = "";

    if (type === 'summary') {
      headers = ["Date", "Invoice #", "Customer", "Phone", "Items Summary", "Total Amount", "Status"];
      rows = filteredOrders.map(order => [
        new Date(order.created_at).toLocaleDateString(),
        order.invoice_number || order.id,
        `"${order.client_name}"`,
        `"${order.client_phone || ''}"`,
        `"${(order.order_items || []).map(i => `${i.item_name} (${i.quantity})`).join(', ')}"`,
        order.total_amount,
        order.payment_status
      ]);
      filename = `orders_summary_${startDate}_to_${endDate}.csv`;
    } else {
      // DETAILED (One row per item)
      headers = ["Date", "Invoice #", "Customer", "Item Name", "Quantity", "Unit Price", "Total Price", "Status"];
      filteredOrders.forEach(order => {
        const orderDate = new Date(order.created_at).toLocaleDateString();
        const invoice = order.invoice_number || order.id;
        const customer = `"${order.client_name}"`;

        if (order.order_items && order.order_items.length > 0) {
          order.order_items.forEach(item => {
            rows.push([
              orderDate,
              invoice,
              customer,
              `"${item.item_name}"`,
              item.quantity,
              item.price,
              item.price * item.quantity,
              order.payment_status
            ]);
          });
        } else {
          // Include empty order row if no items
          rows.push([orderDate, invoice, customer, "NO ITEMS", 0, 0, 0, order.payment_status]);
        }
      });
      filename = `item_details_${startDate}_to_${endDate}.csv`;
    }

    // Generate CSV
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-brand-gray flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-black font-display uppercase tracking-widest text-sm">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-gray p-4 sm:p-8">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 border-l-4 shadow-lg flex items-center space-x-3 transition-all duration-300 animate-slideInRight bg-white ${notification.type === 'error' ? 'border-red-500' : 'border-green-500'
          }`}>
          <span className={`font-bold uppercase text-xs tracking-wider ${notification.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
            {notification.message}
          </span>
        </div>
      )}

      {/* Modals */}


      {confirmPaymentOrder && (
        <ConfirmPaymentModal
          orderDetails={confirmPaymentOrder}
          onConfirm={() => updatePaymentStatus(confirmPaymentOrder)}
          onCancel={() => setConfirmPaymentOrder(null)}
        />
      )}

      {selectedOrderForInvoice && (
        <InvoiceModal
          order={selectedOrderForInvoice}
          onClose={() => setSelectedOrderForInvoice(null)}
        />
      )}

      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={handleExportData}
        />
      )}

      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 no-print">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-black font-display text-brand-black uppercase tracking-tighter">
                House of Noodles<span className="text-brand-red text-6xl leading-none">.</span>
              </h1>
              <p className="text-gray-500 uppercase tracking-widest text-xs mt-1 font-bold">
                Daily Kitchen Tracker
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="lg:hidden text-gray-400 hover:text-black transition-colors"
              title="Sign Out"
            >
              <LogOut size={24} />
            </button>
          </div>

          <div className="flex flex-row gap-3 w-full lg:w-auto">
            <button
              onClick={handleLogout}
              className="hidden lg:flex bg-gray-100 items-center justify-center border border-transparent text-gray-600 px-4 py-3 font-bold uppercase tracking-wider text-xs hover:bg-gray-200 transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
            {role === 'admin' && (
              <>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex-1 lg:flex-none bg-white border border-gray-300 text-gray-700 px-6 py-3 font-bold uppercase tracking-wider text-xs hover:bg-gray-50 transition-colors shadow-sm"
                  title="Download Report"
                >
                  Export Data
                </button>
                <Link to="/menu" className="flex-1 lg:flex-none">
                  <button className="w-full h-full border border-black text-black px-6 py-3 font-bold uppercase tracking-wider text-xs hover:bg-gray-50 transition-colors">
                    Manage Menu
                  </button>
                </Link>
              </>
            )}
            <Link to="/add-order" className="flex-1 lg:flex-none">
              <button className="w-full bg-brand-red text-white px-6 py-3 font-bold uppercase tracking-wider text-xs hover:bg-red-700 transition-colors shadow-sm">
                New Order
              </button>
            </Link>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="bg-white border border-gray-200 p-4 mb-6 sticky top-0 z-20 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center no-print">
          {/* Tabs & Date Filter */}
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("ongoing")}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === "ongoing"
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-500 hover:text-black"
                  }`}
              >
                Ongoing
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === "completed"
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-500 hover:text-black"
                  }`}
              >
                Completed
              </button>
            </div>

            {/* Date Filter Dropdown */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-white border border-gray-300 text-gray-700 text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-md focus:outline-none focus:ring-1 focus:ring-black focus:border-black cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>


          {/* Search */}
          <div className="relative w-full lg:w-96">
            <input
              type="text"
              placeholder="SEARCH..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black focus:border-black uppercase text-sm placeholder-gray-400 rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {processedOrders.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 p-12 text-center rounded-lg no-print">
            <p className="text-gray-400 font-display uppercase text-xl">
              No {activeTab} orders {dateFilter !== 'all' ? `for ${dateFilter}` : ''}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 shadow-sm overflow-hidden no-print">
            {/* Desktop View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-white">
                    {[
                      "Status",
                      "Customer",
                      "Items",
                      "Total",
                      "Actions"
                    ].map((h) => (
                      <th key={h} className="p-4 text-xs font-black uppercase tracking-wider text-black">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {processedOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="p-4">
                        <span className={`inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-widest border ${order.payment_status === "Paid"
                          ? "border-green-600 text-green-700 bg-green-50"
                          : "border-red-500 text-red-600 bg-red-50"
                          }`}>
                          {order.payment_status === "Paid" ? "PAID" : "ONGOING"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-sm text-gray-900">{order.client_name}</div>
                        {order.client_phone && (
                          <div className="text-xs text-gray-400 font-mono mt-1">{order.client_phone}</div>
                        )}
                        <div className="text-[10px] text-gray-400 mt-1 uppercase">
                          {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-gray-600 uppercase max-w-xs truncate">
                          {formatOrderItems(order)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-sm">₹{order.total_amount}</div>
                      </td>
                      <td className="p-4 flex items-center gap-2">
                        {/* Edit Button - ONLY for Ongoing */}
                        {activeTab === "ongoing" && (
                          <button
                            onClick={() => navigate(`/edit-order/${order.id}`)}
                            className="flex items-center gap-1 text-xs font-bold text-gray-600 uppercase tracking-wider hover:bg-gray-200 px-2 py-1 border border-transparent hover:border-gray-300"
                            title="Edit Order"
                          >
                            <Pencil size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedOrderForInvoice(order)}
                          className="flex items-center gap-1 text-xs font-bold text-brand-black uppercase tracking-wider hover:bg-gray-50 px-2 py-1 border border-gray-200"
                          title="Cash Memo"
                        >
                          <Receipt size={14} /> Memo
                        </button>

                        {/* Mark Paid - ONLY for Ongoing */}
                        {order.payment_status !== "Paid" && activeTab === "ongoing" && (
                          <button
                            onClick={() => setConfirmPaymentOrder(order)}
                            className="text-xs font-bold text-brand-red uppercase tracking-wider hover:underline border-b border-transparent hover:border-brand-red ml-2"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden divide-y divide-gray-200">
              {processedOrders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-brand-black text-lg">{order.client_name}</div>
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">{formatOrderItems(order)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase border ${order.payment_status === "Paid" ? "border-green-500 text-green-600" : "border-red-500 text-red-600"
                        }`}>
                        {order.payment_status === "Paid" ? "PAID" : "ONGOING"}
                      </span>
                      {activeTab === "ongoing" && (
                        <button
                          onClick={() => navigate(`/edit-order/${order.id}`)}
                          className="p-1 text-gray-400 hover:text-black"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-4 mb-4">
                    <div>
                      <span className="block text-[10px] uppercase text-gray-400 font-bold">Time</span>
                      <span className="font-mono">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-gray-400 font-bold">Total</span>
                      <span className="font-bold">₹{order.total_amount}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedOrderForInvoice(order)}
                      className="flex-1 py-3 border border-brand-black text-brand-black font-bold uppercase text-xs tracking-wider hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Receipt size={16} /> Memo
                    </button>
                    {order.payment_status !== "Paid" && (
                      <button
                        onClick={() => setConfirmPaymentOrder(order)}
                        className="flex-1 py-3 border border-brand-red text-brand-red font-bold uppercase text-xs tracking-wider hover:bg-red-50 transition-colors"
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>



      {selectedOrderForInvoice && (
        <InvoiceModal
          orderId={selectedOrderForInvoice.id}
          onClose={() => setSelectedOrderForInvoice(null)}
        />
      )}

      {confirmPaymentOrder && (
        <ConfirmPaymentModal
          orderDetails={confirmPaymentOrder}
          onConfirm={() => updatePaymentStatus(confirmPaymentOrder)}
          onCancel={() => setConfirmPaymentOrder(null)}
        />
      )}
    </div>
  );
};

export default OrderList;
