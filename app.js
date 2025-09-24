// ** Supabase Credentials **
const SUPABASE_URL = 'https://vxfksjmbgwtpypgawmtp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4Zmtzam1iZ3d0cHlwZ2F3bXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2OTg3MjMsImV4cCI6MjA3NDI3NDcyM30.IDY5F00_KeQo08O-_Nv1-mObsRbWDbvH0-oEKp_kZgk';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- DOM Elements ---
const navLinks = document.querySelectorAll('nav ul li a');
const pages = document.querySelectorAll('.page');

const homePage = document.getElementById('home-page');
const recordsPage = document.getElementById('records-page');
const milkRecordsView = document.getElementById('milk-records-view');

// Home page elements
const dailyMilkForm = document.getElementById('daily-milk-form');
const customerSelect = document.getElementById('customer-select');
const litersInputHome = document.getElementById('liters-input-home');
const homeSearchInput = document.getElementById('home-search-input');
const homeCustomerList = document.getElementById('home-customer-list');
const customerForm = document.getElementById('customer-form');
const customerIdInput = document.getElementById('customer-id');
const customerNameInput = document.getElementById('customer-name');
const customerMobileInput = document.getElementById('customer-mobile');
const submitBtn = document.getElementById('submit-btn');

// Records page elements
const recordsCustomerList = document.getElementById('records-customer-list');

// Milk records view elements
const backBtn = document.getElementById('back-btn');
const milkRecordsHeading = document.getElementById('milk-records-heading');
const monthlyTotalLittersEl = document.getElementById('monthly-total-liters');
const milkRecordsList = document.getElementById('milk-records-list');

let allCustomers = [];

// --- Navigation & Page Management ---
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = e.target.id.replace('-link', '-page');

        pages.forEach(page => page.classList.add('hidden-page'));
        document.getElementById(pageId).classList.remove('hidden-page');
        navLinks.forEach(navLink => navLink.classList.remove('active'));
        e.target.classList.add('active');

        // Refresh data based on the page
        if (pageId === 'home-page') {
            fetchCustomersAndPopulateForms();
        } else if (pageId === 'records-page') {
            fetchCustomersAndPopulatePayments();
        }
    });
});

backBtn.addEventListener('click', () => {
    milkRecordsView.classList.add('hidden-page');
    recordsPage.classList.remove('hidden-page');
});

// --- Customer Management & Display ---
async function fetchCustomersAndPopulateForms() {
    const { data, error } = await supabase.from('customers').select('*').order('name', { ascending: true });
    if (error) {
        console.error('Error fetching customers:', error.message);
        return;
    }
    allCustomers = data;
    displayCustomersHome(allCustomers);
    populateCustomerSelect(allCustomers);
}

function displayCustomersHome(customers) {
    homeCustomerList.innerHTML = '';
    customers.forEach(customer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${customer.name}</td>
            <td>${customer.mobile_number}</td>
            <td>
                <button class="edit-btn" data-id="${customer.id}">Edit</button>
                <button class="delete-btn" data-id="${customer.id}">Delete</button>
            </td>
        `;
        homeCustomerList.appendChild(row);
    });
}

function populateCustomerSelect(customers) {
    customerSelect.innerHTML = '';
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.name;
        customerSelect.appendChild(option);
    });
}

// --- Add/Edit Customer ---
customerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = customerNameInput.value.trim();
    const mobile_number = customerMobileInput.value.trim();
    const customerId = customerIdInput.value;

    if (!name || !mobile_number) return;

    if (customerId) {
        const { error } = await supabase.from('customers').update({ name, mobile_number }).eq('id', customerId);
        if (error) {
            console.error('Error updating customer:', error.message);
            alert('Failed to update customer.');
        } else {
            alert('Customer updated successfully!');
            resetCustomerForm();
        }
    } else {
        const { error } = await supabase.from('customers').insert([{ name, mobile_number }]);
        if (error) {
            console.error('Error adding customer:', error.message);
            alert('Failed to add customer.');
        } else {
            alert('Customer added successfully!');
            customerForm.reset();
        }
    }
    fetchCustomersAndPopulateForms();
});

function resetCustomerForm() {
    customerForm.reset();
    customerIdInput.value = '';
    submitBtn.textContent = 'Add Customer';
}

// --- Home Page Search ---
homeSearchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredCustomers = allCustomers.filter(customer => 
        customer.name.toLowerCase().includes(searchTerm)
    );
    displayCustomersHome(filteredCustomers);
});

// --- Records Page & Payments ---
async function fetchCustomersAndPopulatePayments() {
    const { data, error } = await supabase.from('customers').select('*').order('name', { ascending: true });
    if (error) {
        console.error('Error fetching customers:', error.message);
        return;
    }
    displayCustomersRecords(data);
}

function displayCustomersRecords(customers) {
    recordsCustomerList.innerHTML = '';
    customers.forEach(customer => {
        const row = document.createElement('tr');
        const paymentIcon = customer.payment_status ? '✅' : '❌';
        const paymentClass = customer.payment_status ? 'payment-done' : 'payment-pending';

        row.innerHTML = `
            <td>${customer.name}</td>
            <td>${customer.mobile_number}</td>
            <td class="payment-col"><span class="payment-status ${paymentClass}" data-id="${customer.id}">${paymentIcon}</span></td>
            <td class="actions-col">
                <button class="view-btn" data-id="${customer.id}" data-name="${customer.name}">View Records</button>
            </td>
        `;
        recordsCustomerList.appendChild(row);
    });
}

// --- Toggle Payment Status ---
recordsCustomerList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('payment-status')) {
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

// --- Daily Milk Entry (Home Page) ---
dailyMilkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const customerId = customerSelect.value;
    const liters = parseFloat(litersInputHome.value);
    const date = new Date().toISOString().split('T')[0];

    if (isNaN(liters) || liters <= 0 || !customerId) {
        alert('Please select a customer and enter a valid amount of milk.');
        return;
    }
    
    // Check if record for today already exists
    const { data: existingRecord } = await supabase
        .from('milk_records')
        .select('id')
        .eq('customer_id', customerId)
        .eq('date', date)
        .single();
    
    if (existingRecord) {
        const confirmUpdate = confirm('A record for today already exists. Do you want to update it?');
        if (confirmUpdate) {
            await supabase.from('milk_records').update({ liters }).eq('id', existingRecord.id);
            alert('Milk data updated successfully!');
        } else {
            return;
        }
    } else {
        await supabase.from('milk_records').insert([{ customer_id: customerId, date: date, liters }]);
        alert('Milk data added successfully!');
    }
    
    dailyMilkForm.reset();
});

// --- Milk Records View ---
recordsCustomerList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('view-btn')) {
        const customerId = e.target.dataset.id;
        const customerName = e.target.dataset.name;
        
        // Show milk records view and hide others
        recordsPage.classList.add('hidden-page');
        milkRecordsView.classList.remove('hidden-page');
        
        milkRecordsHeading.textContent = `${customerName}'s Milk Records`;
        
        fetchMilkRecords(customerId);
    }
});

async function fetchMilkRecords(customerId) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).toISOString().split('T')[0];

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
        milkRecordsList.innerHTML = '<tr><td colspan="2">No milk records for this month.</td></tr>';
    } else {
        records.forEach(record => {
            const row = document.createElement('tr');
            const recordDate = new Date(record.date + 'T12:00:00Z'); // Add time to avoid timezone issues
            const formattedDate = recordDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${parseFloat(record.liters).toFixed(2)} L</td>
            `;
            milkRecordsList.appendChild(row);
            totalLiters += parseFloat(record.liters);
        });
    }

    monthlyTotalLittersEl.textContent = totalLiters.toFixed(2);
}

// Initial fetch to load the Home page
fetchCustomersAndPopulateForms();
