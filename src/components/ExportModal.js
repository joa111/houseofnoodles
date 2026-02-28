import React, { useState } from 'react';
import { X, Download, Calendar } from 'lucide-react';

const ExportModal = ({ onClose, onExport }) => {
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const handleExport = (type) => {
        onExport(type, startDate, endDate);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full max-w-md shadow-2xl overflow-hidden transform transition-all animate-scaleIn">
                {/* Header */}
                <div className="bg-black p-6 flex justify-between items-center text-white">
                    <div>
                        <h2 className="text-xl font-black font-display uppercase tracking-wider">Export Data</h2>
                        <p className="text-xs text-gray-400 font-bold tracking-widest uppercase mt-1">Generate Reports</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* content */}
                <div className="p-8 space-y-8">
                    {/* Date Range Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-brand-black mb-2">
                            <Calendar size={18} />
                            <span className="font-bold uppercase text-xs tracking-wider">Select Date Range</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full border-b-2 border-gray-200 focus:border-black py-2 text-sm font-bold text-gray-800 focus:outline-none transition-colors"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full border-b-2 border-gray-200 focus:border-black py-2 text-sm font-bold text-gray-800 focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Export Buttons */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => handleExport('summary')}
                            className="w-full py-4 border border-black text-black font-bold uppercase tracking-wider text-xs hover:bg-gray-50 flex items-center justify-center gap-2 transition-all"
                        >
                            <Download size={16} /> Export Order Summary
                        </button>
                        <div className="relative flex py-1 items-center">
                            <div className="flex-grow border-t border-gray-200"></div>
                        </div>
                        <button
                            onClick={() => handleExport('detailed')}
                            className="w-full py-4 bg-brand-red text-white font-bold uppercase tracking-wider text-xs hover:bg-red-700 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transition-all"
                        >
                            <Download size={16} /> Export Item Details
                        </button>
                        <p className="text-[10px] text-center text-gray-400 font-medium pt-2">
                            "Item Details" includes one row per item for deep analysis.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
