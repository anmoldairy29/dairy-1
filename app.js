// ** IMPORTANT: Replace with your actual Supabase credentials **
const SUPABASE_URL = "https://vxfksjmbgwtpypgawmtp.supabase.co;"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4Zmtzam1iZ3d0cHlwZ2F3bXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2OTg3MjMsImV4cCI6MjA3NDI3NDcyM30.IDY5F00_KeQo08O-_Nv1-mObsRbWDbvH0-oEKp_kZgk";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- DOM Elements ---
const customerForm = document.getElementById('customer-form');
const customerIdInput = document.getElementById('customer-id');
const customerNameInput = document.getElementById('customer-name');
const customerMobileInput = document.getElementById('customer-mobile');
const submitBtn = document.getElementById('submit-btn');
const customerList = document.getElementById('customer-list');
const searchInput = document.getElementById('search-input');

const customerListSection = document.getElementById('customer-list-section');
const milkRecordsSection = document.getElementById('milk-records-section');
const milkRecordsHeading = document.getElementById('milk-records-heading');
const backToCustomersBtn = document.getElementById('back-to-customers-btn');
const milkEntryForm = document.getElementById('milk-entry-form');
const milkCustomerIdInput = document.getElementById('milk-customer-id');
const litersInput = document.getElementById('liters-input');
const milkRecordsList = document.getElementById('milk-records-list');
const monthlyTotalLittersEl = document.getElementById('monthly-total-liters');

let currentCustomerId = null;

// --- CRUD Operations for Customers ---

// Fetch and display customers
async function fetchCustomers(searchTerm = '') {
    let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: true });

    if (searchTerm) {
        query = query.filter('name', 'ilike', `%${searchTerm}%`);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching customers:', error.message);
        return;
    }
    
    displayCustomers(data);
}

function displayCustomers(customers) {
    customerList.innerHTML = '';
    customers.forEach(customer => {
        const row = document.createElement('tr');
        const paymentIcon = customer.payment_status ? '✅' : '❌';
        const paymentClass = customer.payment_status ? 'payment-done' : 'payment-pending';

        row.innerHTML = `
            <td>${customer.name}</td>
            <td>${customer.mobile_number}</td>
            <td><span class="status-icon ${paymentClass}" data-id="${customer.id}">${paymentIcon}</span></td>
            <td class="actions-cell">
                <button class="edit-btn" data-id="${customer.id}">Edit</button>
                <button class="delete-btn" data-id="${customer.id}">Delete</button>
                <button class="view-milk-btn" data-id="${customer.id}" data-name="${customer.name}">View Milk</button>
            </td>
        `;
        customerList.appendChild(row);
    });
}

// Add/Edit Customer
customerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = customerNameInput.value.trim();
    const mobile_number = customerMobileInput.value.trim();
    const customerId = customerIdInput.value;

    if (!name || !mobile_number) return;

    if (customerId) {
        // Edit existing customer
        const { error } = await supabase
            .from('customers')
            .update({ name, mobile_number })
            .eq('id', customerId);

        if (error) {
            console.error('Error updating customer:', error.message);
            alert('Failed to update customer.');
        } else {
            alert('Customer updated successfully!');
            resetForm();
        }
    } else {
        // Add new customer
        const { error } = await supabase
            .from('customers')
            .insert([{ name, mobile_number }]);

        if (error) {
            console.error('Error adding customer:', error.message);
            alert('Failed to add customer. Check if mobile number is unique.');
        } else {
            alert('Customer added successfully!');
            customerForm.reset();
        }
    }
    fetchCustomers();
});

// Delete Customer
customerList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const id = e.target.dataset.id;
        if (confirm('Are you sure you want to delete this customer? This will also delete all their milk records.')) {
            // First, delete related milk records
            await supabase.from('milk_records').delete().eq('customer_id', id);
            // Then, delete the customer
            const { error } = await supabase.from('customers').delete().eq('id', id);
            if (error) {
                console.error('Error deleting customer:', error.message);
                alert('Failed to delete customer.');
            } else {
                fetchCustomers();
            }
        }
    }
});

// Edit Customer
customerList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('edit-btn')) {
        const id = e.target.dataset.id;
        const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
        if (data) {
            customerIdInput.value = data.id;
            customerNameInput.value = data.name;
            customerMobileInput.value = data.mobile_number;
            submitBtn.textContent = 'Update Customer';
        }
    }
});

// Toggle Payment Status
customerList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('status-icon')) {
        const id = e.target.dataset.id;
        const { data: customer, error } = await supabase.from('customers').select('payment_status').eq('id', id).single();
        if (customer) {
            const newStatus = !customer.payment_status;
            const { error: updateError } = await supabase.from('customers').update({ payment_status: newStatus }).eq('id', id);
            if (!updateError) {
                e.target.textContent = newStatus ? '✅' : '❌';
                e.target.classList.toggle('payment-done', newStatus);
                e.target.classList.toggle('payment-pending', !newStatus);
            }
        }
    }
});

// Search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value;
    fetchCustomers(searchTerm);
});

// --- Daily Milk Tracking ---

// View Milk Records for a specific customer
customerList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('view-milk-btn')) {
        const customerId = e.target.dataset.id;
        const customerName = e.target.dataset.name;
        currentCustomerId = customerId;
        milkCustomerIdInput.value = customerId;

        // Show/Hide sections
        customerListSection.classList.add('hidden');
        milkRecordsSection.classList.remove('hidden');
        milkRecordsHeading.textContent = `${customerName}'s Milk Records`;

        fetchMilkRecords(customerId);
    }
});

// Back to Customers button
backToCustomersBtn.addEventListener('click', () => {
    customerListSection.classList.remove('hidden');
    milkRecordsSection.classList.add('hidden');
    resetForm();
});

// Fetch and display milk records for a customer
async function fetchMilkRecords(customerId) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    const { data, error } = await supabase
        .from('milk_records')
        .select('*')
        .eq('customer_id', customerId)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching milk records:', error.message);
        return;
    }

    displayMilkRecords(data);
}

function displayMilkRecords(records) {
    milkRecordsList.innerHTML = '';
    let totalLiters = 0;

    if (records.length === 0) {
        milkRecordsList.innerHTML = '<tr><td colspan="2">No milk records found for this month.</td></tr>';
    } else {
        records.forEach(record => {
            const row = document.createElement('tr');
            const recordDate = new Date(record.date);
            const formattedDate = recordDate.toLocaleDateString();
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${record.liters} L</td>
            `;
            milkRecordsList.appendChild(row);
            totalLiters += parseFloat(record.liters);
        });
    }

    monthlyTotalLittersEl.textContent = totalLiters.toFixed(2);
}

// Add daily milk record
milkEntryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const liters = parseFloat(litersInput.value);
    const customerId = milkCustomerIdInput.value;
    const date = new Date().toISOString().split('T')[0]; // Auto-saves today's date

    if (isNaN(liters) || liters <= 0 || !customerId) {
        alert('Please enter a valid amount of milk.');
        return;
    }

    // Check if a record for today already exists
    const { data: existingRecord, error: fetchError } = await supabase
        .from('milk_records')
        .select('*')
        .eq('customer_id', customerId)
        .eq('date', date)
        .single();

    if (existingRecord) {
        const confirmation = confirm(`A record for today (${liters}) already exists. Do you want to update it?`);
        if (!confirmation) return;
        
        // Update the existing record
        const { error: updateError } = await supabase
            .from('milk_records')
            .update({ liters: liters })
            .eq('id', existingRecord.id);
        
        if (updateError) {
            console.error('Error updating milk record:', updateError.message);
            alert('Failed to update milk record.');
        } else {
            alert('Milk record updated successfully!');
            litersInput.value = '';
            fetchMilkRecords(customerId);
        }

    } else {
        // Insert a new record
        const { error: insertError } = await supabase
            .from('milk_records')
            .insert([{ customer_id: customerId, date: date, liters: liters }]);

        if (insertError) {
            console.error('Error adding milk record:', insertError.message);
            alert('Failed to add milk record.');
        } else {
            alert('Milk record added successfully!');
            litersInput.value = '';
            fetchMilkRecords(customerId);
        }
    }
});

// --- Utility Functions ---

function resetForm() {
    customerForm.reset();
    customerIdInput.value = '';
    submitBtn.textContent = 'Add Customer';
}

// Initial fetch
fetchCustomers();