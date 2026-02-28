import React, { useState, useEffect } from "react";
import { ArrowLeft, Trash2, Plus, Edit2, X, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { getMenuItems, addMenuItem, deleteMenuItem, updateMenuItem } from "../services/supabaseService";

const MenuManagement = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        price: "",
        category: "General"
    });

    const categories = ["General", "Specials", "Kettle", "Beverages", "Dessert", "Add-ons"];

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const data = await getMenuItems();
            setItems(data);
        } catch (error) {
            console.error("Error fetching menu items:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        try {
            await deleteMenuItem(id);
            fetchItems();
        } catch (error) {
            console.error("Error deleting item:", error);
            alert("Failed to delete item");
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            price: item.price,
            category: item.category || "General"
        });
        setShowForm(true);
    };

    const handleAddNew = () => {
        setEditingItem(null);
        setFormData({
            name: "",
            price: "",
            category: "General"
        });
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingItem) {
                await updateMenuItem(editingItem.id, formData.name, formData.price, formData.category);
            } else {
                await addMenuItem(formData.name, formData.price, formData.category);
            }
            setShowForm(false);
            fetchItems();
        } catch (error) {
            console.error("Error saving item:", error);
            alert("Failed to save item");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Group items by category for display
    const groupedItems = items.reduce((acc, item) => {
        const cat = item.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-brand-gray p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <Link to="/" className="text-gray-400 hover:text-black flex items-center space-x-2 text-xs uppercase tracking-widest font-bold mb-4">
                            <ArrowLeft size={12} />
                            <span>Back to Dashboard</span>
                        </Link>
                        <h1 className="text-4xl font-black uppercase tracking-tighter">Menu Management</h1>
                        <p className="text-gray-500 font-mono text-sm mt-2">Manage your catalog, prices, and categories</p>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="bg-black text-white px-6 py-3 uppercase tracking-wider font-bold text-sm flex items-center gap-2 hover:bg-gray-800 transition-all shadow-md"
                    >
                        <Plus size={16} /> Add New Item
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-400 text-xs uppercase tracking-widest">Loading menu...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Loop through categories */}
                        {Object.keys(groupedItems).sort().map(category => (
                            <div key={category} className="bg-white border border-gray-200 shadow-sm p-6 flex flex-col">
                                <h2 className="text-lg font-black uppercase tracking-wide border-b-2 border-black pb-2 mb-4 flex justify-between items-end">
                                    {category}
                                    <span className="text-xs text-gray-400 font-mono font-normal">({groupedItems[category].length})</span>
                                </h2>
                                <div className="space-y-3 flex-1">
                                    {groupedItems[category].map(item => (
                                        <div key={item.id} className="group flex justify-between items-center py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 transition-colors">
                                            <div>
                                                <div className="font-bold text-sm uppercase text-gray-800">{item.name}</div>
                                                <div className="text-xs text-gray-400 font-mono">₹{item.price}</div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-2 text-gray-400 hover:text-black hover:bg-white border border-transparent hover:border-gray-200"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-white border border-transparent hover:border-gray-200"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {items.length === 0 && (
                            <div className="col-span-full text-center py-20 text-gray-400 uppercase text-sm font-bold tracking-widest">
                                No items found. Click "Add New Item" to start.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-black uppercase tracking-wide">
                                {editingItem ? "Edit Item" : "New Item"}
                            </h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-black">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                    Item Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-bold uppercase text-sm"
                                    placeholder="E.G. LATTE"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                        Price (₹)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-mono text-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                        Category
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        list="categories"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-black focus:ring-1 focus:ring-black uppercase text-sm font-medium"
                                        placeholder="SELECT OR TYPE"
                                    />
                                    <datalist id="categories">
                                        {categories.map(c => <option key={c} value={c} />)}
                                        {/* Add dynamic categories from existing items too? */}
                                        {/* For now, predefined list + any manually typed ones will just populate if reused */}
                                    </datalist>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-black text-white py-4 uppercase tracking-wider font-bold text-sm hover:bg-gray-800 transition-colors flex justify-center items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        "Saving..."
                                    ) : (
                                        <>
                                            <Save size={16} /> Save Item
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuManagement;
