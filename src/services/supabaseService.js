
import { supabase } from '../supabase';

// Menu Items (formerly Order Types)
export const getMenuItems = async () => {
    const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('name');

    if (error) throw error;
    return data;
};

export const addMenuItem = async (name, price, category = 'General') => {
    const { data, error } = await supabase
        .from('menu_items')
        .insert([{ name, price, category }])
        .select();

    if (error) throw error;
    return data[0];
};

export const deleteMenuItem = async (id) => {
    const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

export const updateMenuItem = async (id, name, price, category) => {
    const { data, error } = await supabase
        .from('menu_items')
        .update({ name, price, category })
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
};

// Orders
export const getOrders = async () => {
    // Fetch orders with their items
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (*)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const addOrder = async (orderData) => {
    // 1. Insert Order
    const { client_name, client_phone, notes, items } = orderData;

    // Calculate total from items
    const total_amount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Backward Compatibility: Generate a summary string for the old 'order_type' column
    // This prevents errors if the DB schema still requires order_type (NOT NULL)
    const orderTypeSummary = items.map(i => i.name).join(', ').substring(0, 100) || 'General Order';

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
            client_name,
            client_phone,
            notes,
            total_amount,
            payment_status: 'Not Paid',
            order_type: orderTypeSummary // Satisfies legacy NOT NULL constraint
        }])
        .select()
        .single();

    if (orderError) throw orderError;

    // 2. Insert Order Items
    const orderItemsData = items.map(item => ({
        order_id: order.id,
        item_name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
    }));

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

    if (itemsError) throw itemsError;

    // 3. Create Invoice Record
    const invoiceNumber = `INV-${Date.now()}`;
    const invoiceData = {
        order_id: order.id,
        invoice_number: invoiceNumber,
        total_amount: total_amount,
        issue_date: new Date().toISOString().split('T')[0],
        status: 'pending',
    };

    const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

    if (invoiceError) throw invoiceError;

    return { order, invoice };
};

export const updateOrderPaymentStatus = async (orderId, paymentStatus) => {
    // Update order
    const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ payment_status: paymentStatus })
        .eq('id', orderId);

    if (orderUpdateError) throw orderUpdateError;

    // Update invoice
    const { error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update({ status: paymentStatus === 'Paid' ? 'paid' : 'pending' })
        .eq('order_id', orderId);

    if (invoiceUpdateError) throw invoiceUpdateError;

    return { id: orderId, payment_status: paymentStatus };
};

// Invoices
export const getInvoiceByOrderId = async (orderId) => {
    const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', orderId)
        .single();

    if (invoiceError) throw invoiceError;

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (*)
        `)
        .eq('id', orderId)
        .single();

    if (orderError) throw orderError;

    return {
        ...invoice,
        order: order // Nested order with items
    };
};

export const getOrderById = async (id) => {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (*)
        `)
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
};

export const updateOrder = async (orderId, orderData) => {
    const { client_name, client_phone, notes, items } = orderData;
    const total_amount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderTypeSummary = items.map(i => i.name).join(', ').substring(0, 100) || 'General Order';

    // 1. Update Order Details
    const { error: orderError } = await supabase
        .from('orders')
        .update({
            client_name,
            client_phone,
            notes,
            total_amount,
            order_type: orderTypeSummary
        })
        .eq('id', orderId);

    if (orderError) throw orderError;

    // 2. Update Invoice Amount
    const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
            total_amount
        })
        .eq('order_id', orderId);

    if (invoiceError) throw invoiceError;

    // 3. Sync Items (Delete all and Re-insert) 
    // This is the simplest strategy for full-sync
    const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

    if (deleteError) throw deleteError;

    const orderItemsData = items.map(item => ({
        order_id: orderId,
        item_name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
    }));

    if (orderItemsData.length > 0) {
        const { error: insertError } = await supabase
            .from('order_items')
            .insert(orderItemsData);

        if (insertError) throw insertError;
    }
};
