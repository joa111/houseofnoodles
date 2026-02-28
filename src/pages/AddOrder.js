import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Search, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getMenuItems, addOrder, getOrderById, updateOrder } from "../services/supabaseService";

const AddOrderForm = ({ onOrderAdded = () => { } }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [cartItems, setCartItems] = useState([]);

  // Item Selection State
  const [menuItems, setMenuItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);

  // Fetch Menu Items
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const items = await getMenuItems();
        setMenuItems(items);
      } catch (error) {
        console.error("Failed to fetch menu items", error);
        setMenuItems([]);
      }
    };

    fetchMenuItems();
  }, []);

  // Fetch Order Details if Edit Mode
  useEffect(() => {
    if (isEditMode) {
      const fetchOrder = async () => {
        setIsLoadingOrder(true);
        try {
          const order = await getOrderById(id);
          if (order) {
            setClientName(order.client_name);
            setClientPhone(order.client_phone || "");
            setNotes(order.notes || "");

            // Transform order items back to cart format
            const items = order.order_items.map(item => ({
              id: item.id, // Keep ID for reference if needed, though we delete/re-insert
              name: item.item_name,
              price: item.price,
              quantity: item.quantity,
              category: 'Existing' // Placeholder
            }));
            setCartItems(items);
          }
        } catch (error) {
          console.error("Failed to fetch order details", error);
          alert("Failed to load order. Redirecting...");
          navigate("/");
        } finally {
          setIsLoadingOrder(false);
        }
      };
      fetchOrder();
    }
  }, [id, isEditMode, navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addItemToCart = (item) => {
    const existingItemIndex = cartItems.findIndex((cartItem) => cartItem.name === item.name);

    if (existingItemIndex > -1) {
      // Increment quantity if already exists
      const newCart = [...cartItems];
      newCart[existingItemIndex].quantity += 1;
      setCartItems(newCart);
    } else {
      // Add new item
      setCartItems([...cartItems, { ...item, quantity: 1 }]);
    }
    setSearchQuery("");
    setShowDropdown(false);
  };

  const updateQuantity = (index, delta) => {
    const newCart = [...cartItems];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    setCartItems(newCart);
  };

  const removeItem = (index) => {
    const newCart = [...cartItems];
    newCart.splice(index, 1);
    setCartItems(newCart);
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const orderData = {
        client_name: clientName,
        client_phone: clientPhone,
        notes: notes,
        items: cartItems
      };

      if (isEditMode) {
        await updateOrder(id, orderData);
      } else {
        await addOrder(orderData);
      }

      onOrderAdded();
      navigate("/"); // Redirect back to list

    } catch (error) {
      console.error("Error saving order:", error.message);
      alert("Failed to save order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingOrder) {
    return (
      <div className="min-h-screen bg-brand-gray flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-black font-display uppercase tracking-widest text-sm">Loading Order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-gray p-4 flex items-center justify-center">
      <div className="max-w-4xl w-full bg-white border border-gray-200 shadow-sm relative flex flex-col lg:flex-row">

        {/* Left Side: Order Details & Item Selection */}
        <div className="flex-1 p-8 border-r border-gray-100">
          <div className="mb-8">
            <Link to="/" className="text-gray-400 hover:text-black flex items-center space-x-2 text-xs uppercase tracking-widest font-bold mb-4">
              <ArrowLeft size={12} />
              <span>Back to Dashboard</span>
            </Link>
            <h2 className="text-3xl font-display uppercase tracking-wide">
              {isEditMode ? "Edit Order" : "New Order"}
            </h2>
            <p className="text-xs text-brand-red font-mono font-bold mt-1">
              {new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Customer Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Customer / Table
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  placeholder="NAME OR TABLE #"
                  className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-bold uppercase text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-mono text-sm"
                />
              </div>
            </div>

            {/* Item Search & Add */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Add Items
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="SEARCH MENU..."
                  className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-black focus:ring-1 focus:ring-black uppercase text-sm font-medium"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              </div>

              {showDropdown && filteredItems.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 shadow-xl max-h-60 overflow-auto">
                  {Object.entries(filteredItems.reduce((acc, item) => {
                    const cat = item.category || 'General';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(item);
                    return acc;
                  }, {})).sort().map(([category, items]) => (
                    <div key={category}>
                      <div className="px-4 py-2 bg-gray-100 text-xs font-bold uppercase tracking-wider text-gray-500 sticky top-0">
                        {category}
                      </div>
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                          onClick={() => addItemToCart(item)}
                        >
                          <div>
                            <div className="text-sm uppercase font-bold text-gray-800">{item.name}</div>
                          </div>
                          <div className="font-mono font-bold text-sm">₹{item.price}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                  {filteredItems.length === 0 && (
                    <div className="px-4 py-3 text-gray-400 text-xs uppercase">No items found</div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Kitchen Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="2"
                placeholder="SPICY, NO ONIONS, ETC."
                className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-black focus:ring-1 focus:ring-black uppercase text-sm resize-none"
              ></textarea>
            </div>

          </form>
        </div>

        {/* Right Side: Bill Summary */}
        <div className="w-full lg:w-96 bg-gray-50 p-8 flex flex-col h-full border-t lg:border-t-0 lg:border-l border-gray-200">
          <h3 className="text-sm font-black uppercase tracking-widest text-black mb-6 border-b-2 border-black pb-2">Current Bill</h3>

          <div className="flex-1 overflow-auto mb-6 space-y-4">
            {cartItems.length === 0 ? (
              <div className="text-center text-gray-400 py-8 text-xs uppercase font-bold">
                No items added
              </div>
            ) : (
              cartItems.map((item, index) => (
                <div key={index} className="bg-white p-3 border border-gray-200 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm uppercase text-gray-800 leading-tight w-2/3">{item.name}</span>
                    <span className="font-mono font-bold text-sm">₹{item.price * item.quantity}</span>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center border border-gray-300 bg-gray-100">
                      <button
                        type="button"
                        onClick={() => updateQuantity(index, -1)}
                        className="px-2 py-1 hover:bg-gray-200 transition-colors"
                      >-</button>
                      <span className="px-2 font-mono text-xs font-bold w-8 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(index, 1)}
                        className="px-2 py-1 hover:bg-gray-200 transition-colors"
                      >+</button>
                    </div>
                    <button
                      onClick={() => removeItem(index)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-auto pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-bold uppercase text-gray-600">Total Amount</span>
              <span className="text-2xl font-black font-mono">₹{calculateTotal().toFixed(2)}</span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || cartItems.length === 0}
              className={`w-full py-4 bg-black text-white font-bold uppercase tracking-wider text-sm hover:bg-gray-800 transition-all shadow-lg ${isSubmitting || cartItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? "Saving..." : (isEditMode ? "Update Order" : "Save Order")}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AddOrderForm;