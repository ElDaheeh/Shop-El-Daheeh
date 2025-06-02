    // --- Configuration ---
    // !!! استبدل هذا بالرابط الصحيح لـ Google Apps Script المنشور !!!
    const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwT1fQ9MRkrU61q3mVuwopmQn3Q3NRd0uNPZbKzFeQPo9zBweMjP7Lr1WEhCGeMCwH1KQ/exec'; // Replace with your actual script URL
    const LOCAL_ORDERS_KEY = 'eldaheehLocalOrders';

    // --- DOM Elements ---
    const productsGrid = document.getElementById('productsGrid');
    const cartIcon = document.getElementById('cartIcon');
    const cartCount = document.getElementById('cartCount');
    const cartModal = document.getElementById('cartModal');
    const closeCartModal = document.getElementById('closeCartModal');
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const checkoutModal = document.getElementById('checkoutModal');
    const closeCheckoutModal = document.getElementById('closeCheckoutModal');
    const checkoutForm = document.getElementById('checkoutForm');
    const deliveryOption = document.getElementById('deliveryOption');
    const addressGroup = document.getElementById('addressGroup');
    const submitOrderBtn = document.getElementById('submitOrderBtn');
    const confirmationModal = document.getElementById('confirmationModal');
    const closeConfirmationModal = document.getElementById('closeConfirmationModal');
    const confirmedOrderId = document.getElementById('confirmedOrderId');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const downloadImageBtn = document.getElementById('downloadImageBtn');
    const toast = document.getElementById('toastNotification');
    const searchInput = document.getElementById('searchInput');
    const categoryFiltersContainer = document.getElementById('categoryFilters');
    const myOrdersIcon = document.getElementById('myOrdersIcon');
    const myOrdersModal = document.getElementById('myOrdersModal');
    const closeMyOrdersModal = document.getElementById('closeMyOrdersModal');
    const ordersListContainer = document.getElementById('ordersList');
    const confirmReceiptModal = document.getElementById('confirmReceiptModal');
    const closeConfirmReceiptModal = document.getElementById('closeConfirmReceiptModal');
    const confirmReceiptOrderIdElement = document.getElementById('confirmReceiptOrderId');
    const ratingStarsContainer = document.getElementById('ratingStars');
    const orderRatingInput = document.getElementById('orderRating');
    const submitConfirmReceiptBtn = document.getElementById('submitConfirmReceiptBtn');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const phoneErrorMsg = document.getElementById('phoneError');

    // --- State Variables ---
    let allProducts = []; // Store all fetched products
    let cart = [];
    let orderData = {}; // To store details for the current invoice
    let currentCategoryFilter = 'all';
    let localOrders = []; // Store orders locally
    let currentRating = 0;
    let orderIdToConfirm = null;

    // --- Initialization ---
    document.addEventListener('DOMContentLoaded', () => {
      loadCartFromLocalStorage();
      loadLocalOrders(); // Load saved orders
      fetchProducts();
      setupEventListeners();
      setMinPickupDate();
    });

    // --- Event Listeners Setup ---
    function setupEventListeners() {
      cartIcon.addEventListener('click', () => openModal(cartModal));
      closeCartModal.addEventListener('click', () => closeModal(cartModal));
      checkoutBtn.addEventListener('click', () => {
        if (cart.length > 0) {
          closeModal(cartModal);
          openModal(checkoutModal);
        }
      });
      closeCheckoutModal.addEventListener('click', () => closeModal(checkoutModal));
      deliveryOption.addEventListener('change', () => {
        addressGroup.style.display = deliveryOption.checked ? 'flex' : 'none';
        document.getElementById('address').required = deliveryOption.checked;
      });
      checkoutForm.addEventListener('submit', handleOrderSubmit);
      closeConfirmationModal.addEventListener('click', () => {
          closeModal(confirmationModal);
          resetCart(); // Reset cart after closing confirmation
      });
      downloadPdfBtn.addEventListener('click', downloadInvoiceAsPdf);
      downloadImageBtn.addEventListener('click', downloadInvoiceAsImage);

      // Search Input Listener
      searchInput.addEventListener('input', handleSearchAndFilter);

      // Category Filter Listener (using event delegation)
      categoryFiltersContainer.addEventListener('click', (event) => {
          if (event.target.classList.contains('category-filter-btn')) {
              const category = event.target.getAttribute('data-category');
              if (category !== currentCategoryFilter) {
                  currentCategoryFilter = category;
                  categoryFiltersContainer.querySelectorAll('.category-filter-btn').forEach(btn => btn.classList.remove('active'));
                  event.target.classList.add('active');
                  handleSearchAndFilter();
              }
          }
      });

      // My Orders Listeners
      myOrdersIcon.addEventListener('click', () => {
          renderLocalOrders(); // Re-render orders when opening
          openModal(myOrdersModal);
      });
      closeMyOrdersModal.addEventListener('click', () => closeModal(myOrdersModal));

      // Confirm Receipt Modal Listeners
      closeConfirmReceiptModal.addEventListener('click', () => closeModal(confirmReceiptModal));
      ratingStarsContainer.addEventListener('click', handleRatingStarClick);
      submitConfirmReceiptBtn.addEventListener('click', handleSubmitConfirmReceipt);

      // Event delegation for confirm receipt buttons in the orders list
      ordersListContainer.addEventListener('click', (event) => {
          if (event.target.classList.contains('confirm-receipt-btn')) {
              orderIdToConfirm = event.target.getAttribute('data-order-id');
              openConfirmReceiptModal(orderIdToConfirm);
          }
      });

      // Phone number validation listener
      phoneNumberInput.addEventListener('input', validatePhoneNumberInput);
    }

    // --- Product Handling ---
    async function fetchProducts() {
      productsGrid.innerHTML = '<div class="loading-products"><i class="fas fa-spinner fa-spin"></i> جاري تحميل المنتجات...</div>';
      try {
        const response = await fetch(`${APP_SCRIPT_URL}?action=getProducts`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
          allProducts = result.data;
          populateCategoryFilters();
          renderProducts(allProducts); // Initial display
        } else {
          console.error('Failed to fetch products:', result.error);
          productsGrid.innerHTML = '<div class="loading-products"><i class="fas fa-exclamation-triangle"></i> فشل في تحميل المنتجات.</div>';
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        productsGrid.innerHTML = `<div class="loading-products"><i class="fas fa-exclamation-triangle"></i> حدث خطأ أثناء تحميل المنتجات: ${error.message}</div>`;
      }
    }

    function populateCategoryFilters() {
        const categories = ['all', ...new Set(allProducts.map(p => p.category || 'غير مصنف'))];
        categoryFiltersContainer.innerHTML = '<span class="filter-label">التصنيف:</span>'; // Clear existing buttons except label

        categories.forEach(category => {
            const button = document.createElement('button');
            button.classList.add('category-filter-btn');
            button.setAttribute('data-category', category);
            button.textContent = category === 'all' ? 'الكل' : category;
            if (category === currentCategoryFilter) { // Use current filter state
                button.classList.add('active');
            }
            categoryFiltersContainer.appendChild(button);
        });
    }

    function handleSearchAndFilter() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        let filteredProducts = allProducts;

        // Filter by category
        if (currentCategoryFilter !== 'all') {
            filteredProducts = filteredProducts.filter(product => (product.category || 'غير مصنف') === currentCategoryFilter);
        }

        // Filter by search term (name)
        if (searchTerm) {
            filteredProducts = filteredProducts.filter(product =>
                product.name.toLowerCase().includes(searchTerm)
            );
        }

        renderProducts(filteredProducts);
    }

    function renderProducts(productsToDisplay) {
      productsGrid.innerHTML = ''; // Clear previous products or loading message

      if (productsToDisplay.length === 0) {
        productsGrid.innerHTML = '<div class="loading-products"><i class="fas fa-info-circle"></i> لا توجد منتجات تطابق البحث أو التصنيف المحدد.</div>';
        return;
      }

      productsToDisplay.forEach(product => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        const stock = product.qty || 0;
        const isOutOfStock = stock <= 0;

        card.innerHTML = `
          <div class="product-info">
            <div class="product-name">${product.name}</div>
            <div class="product-category">${product.category || 'غير مصنف'}</div>
            <div class="product-price">${product.price.toFixed(2)} جنيه</div>
            <div class="product-stock" style="color: ${isOutOfStock ? 'var(--danger-color)' : 'var(--text-light)'};">
              المتوفر: ${stock}
            </div>
            <div class="product-actions">
              <button class="add-to-cart-btn" data-product-name="${product.name}" ${isOutOfStock ? 'disabled' : ''}>
                <i class="fas fa-cart-plus"></i> ${isOutOfStock ? 'نفدت الكمية' : 'أضف للسلة'}
              </button>
              <div class="quantity-control">
                <button class="quantity-btn decrease-qty" data-product-name="${product.name}" ${isOutOfStock ? 'disabled' : ''}>-</button>
                <input type="number" class="quantity-input" value="1" min="1" max="${stock}" data-product-name="${product.name}" ${isOutOfStock ? 'disabled' : ''}>
                <button class="quantity-btn increase-qty" data-product-name="${product.name}" ${isOutOfStock ? 'disabled' : ''}>+</button>
              </div>
            </div>
          </div>
        `;
        productsGrid.appendChild(card);
      });

      // Add event listeners for the new buttons and inputs
      addCardEventListeners();
    }

    function addCardEventListeners() {
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.removeEventListener('click', handleAddToCart);
            button.addEventListener('click', handleAddToCart);
        });
        document.querySelectorAll('.increase-qty').forEach(button => {
            button.removeEventListener('click', handleQuantityChange);
            button.addEventListener('click', handleQuantityChange);
        });
        document.querySelectorAll('.decrease-qty').forEach(button => {
            button.removeEventListener('click', handleQuantityChange);
            button.addEventListener('click', handleQuantityChange);
        });
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.removeEventListener('change', handleQuantityInputChange);
            input.addEventListener('change', handleQuantityInputChange);
            input.removeEventListener('input', handleQuantityInputChange); // Also check on input
            input.addEventListener('input', handleQuantityInputChange);
        });
    }

    function handleAddToCart(event) {
        const button = event.currentTarget;
        const productName = button.getAttribute('data-product-name');
        const product = allProducts.find(p => p.name === productName);
        const quantityInput = document.querySelector(`.quantity-input[data-product-name="${productName}"]`);
        const quantity = parseInt(quantityInput.value);
        const stock = product ? (product.qty || 0) : 0;

        if (product && quantity > 0 && stock >= quantity) {
            addToCart(product, quantity);
        } else if (product && stock < quantity) {
            showToast(`الكمية المطلوبة لـ ${product.name} غير متوفرة. المتوفر: ${stock}`, 'error');
            quantityInput.value = stock > 0 ? stock : 1; // Adjust input if possible
        } else if (!product) {
            showToast('لم يتم العثور على المنتج.', 'error');
        } else {
             showToast('الكمية غير صالحة.', 'error');
             quantityInput.value = 1;
        }
    }

    function handleQuantityChange(event) {
        const button = event.currentTarget;
        const productName = button.getAttribute('data-product-name');
        const input = document.querySelector(`.quantity-input[data-product-name="${productName}"]`);
        const product = allProducts.find(p => p.name === productName);
        const stock = product ? (product.qty || 0) : 0;
        let currentValue = parseInt(input.value);

        if (isNaN(currentValue)) currentValue = 1;

        if (button.classList.contains('increase-qty')) {
            if (currentValue < stock) {
                input.value = currentValue + 1;
            }
        } else if (button.classList.contains('decrease-qty')) {
            if (currentValue > 1) {
                input.value = currentValue - 1;
            }
        }
    }

    function handleQuantityInputChange(event) {
        const input = event.currentTarget;
        const productName = input.getAttribute('data-product-name');
        const product = allProducts.find(p => p.name === productName);
        const stock = product ? (product.qty || 0) : 0;
        let value = parseInt(input.value);

        if (isNaN(value) || value < 1) {
            input.value = 1;
        } else if (value > stock) {
            input.value = stock;
            if (stock > 0) {
                showToast(`الكمية القصوى المتوفرة لـ ${product.name} هي ${stock}`, 'error');
            }
        }
    }

    // --- Cart Handling ---
    function addToCart(product, quantity) {
      const existingItem = cart.find(item => item.name === product.name);
      const stock = product.qty || 0;

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity <= stock) {
            existingItem.quantity = newQuantity;
            showToast(`تم تحديث كمية ${product.name} في السلة.`, 'success');
        } else {
            showToast(`لا يمكن إضافة المزيد من ${product.name}. الكمية المتوفرة ${stock}.`, 'error');
            return; // Do not proceed if quantity exceeds stock
        }
      } else {
        if (quantity <= stock) {
            cart.push({ ...product, quantity: quantity });
            showToast(`تمت إضافة ${product.name} إلى السلة.`, 'success');
        } else {
             showToast(`الكمية المطلوبة لـ ${product.name} غير متوفرة. المتوفر: ${stock}`, 'error');
             return; // Do not add if initial quantity exceeds stock
        }
      }
      updateCartDisplay();
      saveCartToLocalStorage();
    }

    function updateCartDisplay() {
      cartItemsContainer.innerHTML = ''; // Clear existing items
      let total = 0;

      if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<div class="empty-cart-message">
            <i class="fas fa-shopping-basket"></i>
            سلة المشتريات فارغة.
        </div>`;
        checkoutBtn.disabled = true;
      } else {
        cart.forEach(item => {
          const itemElement = document.createElement('div');
          itemElement.classList.add('cart-item');
          const itemTotal = item.price * item.quantity;
          const stock = item.qty || 0;
          total += itemTotal;

          itemElement.innerHTML = `
            <div class="cart-item-info">
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-price">${item.price.toFixed(2)} جنيه</div>
            </div>
            <div class="cart-item-quantity">
              <button class="quantity-btn decrease-cart-qty" data-product-name="${item.name}">-</button>
              <span>${item.quantity}</span>
              <button class="quantity-btn increase-cart-qty" data-product-name="${item.name}" ${item.quantity >= stock ? 'disabled' : ''}>+</button>
            </div>
            <div class="cart-item-total">${itemTotal.toFixed(2)} جنيه</div>
            <button class="remove-item" data-product-name="${item.name}" title="إزالة المنتج"><i class="fas fa-trash-alt"></i></button>
          `;
          cartItemsContainer.appendChild(itemElement);
        });
        checkoutBtn.disabled = false;

        // Add event listeners for cart quantity buttons and remove button
        addCartItemEventListeners();
      }

      cartTotalElement.textContent = `${total.toFixed(2)} جنيه`;
      updateCartCount();
    }

    function addCartItemEventListeners() {
        document.querySelectorAll('.increase-cart-qty').forEach(button => {
            button.removeEventListener('click', handleCartQuantityChange);
            button.addEventListener('click', handleCartQuantityChange);
        });
        document.querySelectorAll('.decrease-cart-qty').forEach(button => {
            button.removeEventListener('click', handleCartQuantityChange);
            button.addEventListener('click', handleCartQuantityChange);
        });
        document.querySelectorAll('.remove-item').forEach(button => {
            button.removeEventListener('click', handleRemoveFromCart);
            button.addEventListener('click', handleRemoveFromCart);
        });
    }

    function handleCartQuantityChange(event) {
        const button = event.currentTarget;
        const productName = button.getAttribute('data-product-name');
        const cartItem = cart.find(item => item.name === productName);
        // Find product in *allProducts* to check stock, not just cart item
        const product = allProducts.find(p => p.name === productName);
        const stock = product ? (product.qty || 0) : 0;

        if (!cartItem || !product) return;

        if (button.classList.contains('increase-cart-qty')) {
            if (cartItem.quantity < stock) {
                cartItem.quantity++;
            } else {
                showToast(`الكمية القصوى المتوفرة لـ ${product.name} هي ${stock}`, 'error');
                return;
            }
        } else if (button.classList.contains('decrease-cart-qty')) {
            if (cartItem.quantity > 1) {
                cartItem.quantity--;
            } else {
                // Remove item if quantity becomes 0
                handleRemoveFromCart(event, productName); // Pass name explicitly
                return; // Exit after removal
            }
        }
        updateCartDisplay();
        saveCartToLocalStorage();
    }

    function handleRemoveFromCart(event, explicitProductName = null) {
        let productName = explicitProductName;
        if (!productName) {
            const button = event.target.closest('.remove-item');
            if (!button) return;
            productName = button.getAttribute('data-product-name');
        }

        if (!productName) return;

        cart = cart.filter(item => item.name !== productName);
        updateCartDisplay();
        saveCartToLocalStorage();
        showToast(`تمت إزالة ${productName} من السلة.`, 'info');
    }

    function updateCartCount() {
      const count = cart.reduce((sum, item) => sum + item.quantity, 0);
      cartCount.textContent = count;
      cartCount.style.display = count > 0 ? 'flex' : 'none';
    }

    // --- Phone Number Validation ---
    function validatePhoneNumber(phone) {
        // Basic Egyptian phone number validation (010, 011, 012, 015 followed by 8 digits)
        const phoneRegex = /^01[0125][0-9]{8}$/;
        return phoneRegex.test(phone);
    }

    function validatePhoneNumberInput() {
        const isValid = validatePhoneNumber(phoneNumberInput.value);
        if (isValid || phoneNumberInput.value === '') {
            phoneNumberInput.classList.remove('invalid');
            phoneErrorMsg.style.display = 'none';
        } else {
            phoneNumberInput.classList.add('invalid');
            phoneErrorMsg.style.display = 'block';
        }
        return isValid;
    }

    // --- Order Handling ---
    async function handleOrderSubmit(event) {
      event.preventDefault();

      // Validate phone number before proceeding
      if (!validatePhoneNumberInput()) {
          showToast('يرجى إدخال رقم هاتف صحيح.', 'error');
          phoneNumberInput.focus();
          return;
      }

      const submitSpinner = submitOrderBtn.querySelector('.spinner');
      submitSpinner.style.display = 'inline-block';
      submitOrderBtn.disabled = true;

      try {
        // 1. Get next order ID from backend
        const orderIdResponse = await fetch(`${APP_SCRIPT_URL}?action=getNextOrderId`);
         if (!orderIdResponse.ok) {
            throw new Error(`فشل في الاتصال بالخادم للحصول على رقم الطلب (HTTP ${orderIdResponse.status})`);
        }
        const orderIdResult = await orderIdResponse.json();

        if (!orderIdResult.success || !orderIdResult.orderId) {
          throw new Error(orderIdResult.error || 'فشل في الحصول على رقم الطلب من الخادم.');
        }

        // 2. Prepare order data for backend and local storage
        const currentOrderData = {}; // Use a local variable for this specific order
        currentOrderData.orderId = orderIdResult.orderId;
        currentOrderData.customerName = document.getElementById('customerName').value.trim();
        currentOrderData.phoneNumber = phoneNumberInput.value.trim(); // Use validated number
        currentOrderData.address = deliveryOption.checked ? document.getElementById('address').value.trim() : 'استلام من المكتبة';
        const pickupDate = document.getElementById('pickupDate').value;
        const pickupTime = document.getElementById('pickupTime').value;
        currentOrderData.pickupTime = `${pickupDate} ${pickupTime}`;
        currentOrderData.orderDate = new Date().toISOString(); // Use ISO format for consistency
        currentOrderData.totalAmount = cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
        currentOrderData.status = 'submitted'; // Initial status for local storage
        // Simplify items for local storage
        currentOrderData.items = cart.map(item => ({
          name: item.name,
          price: item.price.toFixed(2),
          quantity: item.quantity,
          total: (item.price * item.quantity).toFixed(2)
        }));

        // *** NEW: Format order details string for the sheet ***
        const orderDetailsString = currentOrderData.items.map(item => {
            return `${item.name} (الكمية: ${item.quantity}) - ${item.total} جنيه`;
        }).join('\n'); // Use newline character to separate items

        // 3. Submit order to backend using GET
        const params = new URLSearchParams({
            action: 'submitOrder',
            orderId: currentOrderData.orderId,
            orderDate: new Date(currentOrderData.orderDate).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }),
            customerName: currentOrderData.customerName,
            phoneNumber: currentOrderData.phoneNumber,
            address: currentOrderData.address,
            pickupTime: currentOrderData.pickupTime,
            totalAmount: currentOrderData.totalAmount,
            orderDetails: orderDetailsString // Send formatted multi-line string
        });

        const submitResponse = await fetch(`${APP_SCRIPT_URL}?${params.toString()}`);
        if (!submitResponse.ok) {
             throw new Error(`فشل في الاتصال بالخادم لتأكيد الطلب (HTTP ${submitResponse.status})`);
        }
        const submitResult = await submitResponse.json();

        if (!submitResult.success) {
          throw new Error(submitResult.error || 'فشل الخادم في تسجيل الطلب. يرجى المحاولة مرة أخرى.');
        }

        // 4. Order submitted successfully to backend - Proceed with UI updates
        orderData = { ...currentOrderData }; // Update global orderData for invoice
        confirmedOrderId.textContent = orderData.orderId;
        prepareInvoice(); // Prepare invoice data *before* showing modal

        // 5. Save order to local storage
        saveOrderLocally(currentOrderData);

        // 6. Show confirmation, close checkout, reset form/cart
        closeModal(checkoutModal);
        openModal(confirmationModal);
        checkoutForm.reset();
        phoneNumberInput.classList.remove('invalid'); // Reset phone validation style
        phoneErrorMsg.style.display = 'none';
        addressGroup.style.display = 'none';
        // Cart reset is handled when confirmation modal is closed

      } catch (error) {
        console.error('Error submitting order:', error);
        showToast(`خطأ: ${error.message}`, 'error');
      } finally {
        submitSpinner.style.display = 'none';
        submitOrderBtn.disabled = false;
      }
    }

    // --- Local Order Storage & Display ---
    function saveOrderLocally(order) {
        localOrders.push(order);
        localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(localOrders));
    }

    function loadLocalOrders() {
        const savedOrders = localStorage.getItem(LOCAL_ORDERS_KEY);
        if (savedOrders) {
            try {
                localOrders = JSON.parse(savedOrders);
            } catch (e) {
                console.error("Error parsing local orders:", e);
                localOrders = [];
                localStorage.removeItem(LOCAL_ORDERS_KEY); // Clear corrupted data
            }
        }
    }

    function updateLocalOrderStatus(orderId, newStatus, rating = 0) {
        const orderIndex = localOrders.findIndex(o => o.orderId === orderId);
        if (orderIndex > -1) {
            localOrders[orderIndex].status = newStatus;
            if (rating > 0) {
                localOrders[orderIndex].rating = rating;
            }
            localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(localOrders));
            return true;
        }
        return false;
    }

    function renderLocalOrders() {
        ordersListContainer.innerHTML = ''; // Clear previous list
        if (localOrders.length === 0) {
            ordersListContainer.innerHTML = '<div class="empty-orders-message"><i class="fas fa-box-open"></i> لا توجد طلبات محفوظة.</div>';
            return;
        }

        // Sort orders by date, newest first
        const sortedOrders = [...localOrders].sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

        sortedOrders.forEach(order => {
            const orderElement = document.createElement('div');
            orderElement.classList.add('order-item');
            const orderDateFormatted = new Date(order.orderDate).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
            const statusText = order.status === 'submitted' ? 'تم الإرسال' : (order.status === 'completed' ? 'تم الاستلام' : order.status);
            const statusClass = order.status === 'submitted' ? 'order-status-submitted' : (order.status === 'completed' ? 'order-status-completed' : 'order-status-processing');
            const ratingDisplay = order.rating ? `<div class="rating-stars" style="font-size: 1rem; color: var(--accent-dark);">${'&#9733;'.repeat(order.rating)}${'&#9734;'.repeat(5 - order.rating)}</div>` : '';

            orderElement.innerHTML = `
                <div class="order-item-details">
                    <p><strong>رقم الطلب:</strong> ${order.orderId}</p>
                    <p><strong>التاريخ:</strong> ${orderDateFormatted}</p>
                    <p><strong>الإجمالي:</strong> ${order.totalAmount} جنيه</p>
                    <p><strong>الحالة:</strong> <span class="order-item-status ${statusClass}">${statusText}</span> ${ratingDisplay}</p>
                </div>
                <div class="order-item-actions">
                    ${order.status === 'submitted' ?
                        `<button class="confirm-receipt-btn" data-order-id="${order.orderId}"><i class="fas fa-check-double"></i> تأكيد الاستلام</button>` :
                        (order.status === 'completed' ? '<span><i class="fas fa-check-circle" style="color: var(--success-color);"></i> مكتمل</span>' : '')
                    }
                </div>
            `;
            ordersListContainer.appendChild(orderElement);
        });
    }

    // --- Confirm Receipt and Rating --- 
    function openConfirmReceiptModal(orderId) {
        orderIdToConfirm = orderId;
        confirmReceiptOrderIdElement.textContent = orderId;
        // Reset rating stars
        currentRating = 0;
        orderRatingInput.value = 0;
        ratingStarsContainer.querySelectorAll('span').forEach(star => star.classList.remove('active'));
        openModal(confirmReceiptModal);
    }

    function handleRatingStarClick(event) {
        if (event.target.tagName === 'SPAN') {
            currentRating = parseInt(event.target.getAttribute('data-value'));
            orderRatingInput.value = currentRating;
            // Update visual state of stars
            ratingStarsContainer.querySelectorAll('span').forEach(star => {
                star.classList.toggle('active', parseInt(star.getAttribute('data-value')) <= currentRating);
            });
        }
    }

    async function handleSubmitConfirmReceipt() {
        if (!orderIdToConfirm) return;

        const button = submitConfirmReceiptBtn;
        const spinner = button.querySelector('.spinner');
        spinner.style.display = 'inline-block';
        button.disabled = true;

        try {
            const ratingValue = parseInt(orderRatingInput.value) || 0;
            const newStatus = 'completed';

            // 1. Update status on the backend
            const params = new URLSearchParams({
                action: 'updateOrderStatus',
                orderId: orderIdToConfirm,
                status: newStatus,
                rating: ratingValue
            });

            const response = await fetch(`${APP_SCRIPT_URL}?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`فشل الاتصال بالخادم لتحديث حالة الطلب (HTTP ${response.status})`);
            }
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'فشل الخادم في تحديث حالة الطلب.');
            }

            // 2. Update status in local storage
            const updatedLocally = updateLocalOrderStatus(orderIdToConfirm, newStatus, ratingValue);

            if (updatedLocally) {
                showToast(`تم تأكيد استلام الطلب ${orderIdToConfirm} بنجاح.`, 'success');
                closeModal(confirmReceiptModal);
                renderLocalOrders(); // Refresh the orders list in the background modal
            } else {
                 showToast(`تم تحديث الحالة في الخادم، لكن لم يتم العثور على الطلب ${orderIdToConfirm} محلياً.`, 'warning');
                 closeModal(confirmReceiptModal);
            }

        } catch (error) {
            console.error('Error confirming receipt:', error);
            showToast(`خطأ: ${error.message}`, 'error');
        } finally {
            spinner.style.display = 'none';
            button.disabled = false;
            orderIdToConfirm = null; // Reset order ID
        }
    }


    // --- Invoice Handling ---
    function prepareInvoice() {
      // Ensure orderData is populated from the *successfully submitted* order
      if (!orderData || !orderData.orderId) {
          console.error("Order data is missing for invoice preparation.");
          return;
      }
      const invoiceDateFormatted = orderData.orderDate ? new Date(orderData.orderDate).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : 'غير متوفر';
      // Set invoice details
      document.getElementById('invoiceDate').textContent = invoiceDateFormatted;
      document.getElementById('invoiceOrderId').textContent = orderData.orderId;
      document.getElementById('invoiceCustomerName').textContent = orderData.customerName || '';
      document.getElementById('invoicePhoneNumber').textContent = orderData.phoneNumber || '';
      document.getElementById('invoiceAddress').textContent = orderData.address || '';
      document.getElementById('invoicePickupTime').textContent = orderData.pickupTime || '';
      document.getElementById('invoiceTotalAmount').textContent = parseFloat(orderData.totalAmount || 0).toFixed(2);

      // Clear and populate invoice items from orderData.items
      const invoiceItems = document.getElementById('invoiceItems');
      invoiceItems.innerHTML = ''; // Clear previous items

      if (orderData.items && orderData.items.length > 0) {
          orderData.items.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${index + 1}</td>
              <td>${item.name}</td>
              <td>${item.price} جنيه</td>
              <td>${item.quantity}</td>
              <td>${item.total} جنيه</td>
            `;
            invoiceItems.appendChild(row);
          });
      } else {
          invoiceItems.innerHTML = '<tr><td colspan="5">لا توجد تفاصيل منتجات لهذا الطلب.</td></tr>';
      }
    }

    // Download Invoice as PDF
    function downloadInvoiceAsPdf() {
      if (!orderData || !orderData.orderId) {
          showToast('بيانات الطلب غير متوفرة لتحميل الفاتورة.', 'error');
          return;
      }
      showToast('جاري تجهيز ملف PDF...', 'info');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'pt', 'a4');
      const invoiceElement = document.getElementById('invoiceTemplate');

      invoiceElement.style.display = 'block';
      invoiceElement.style.position = 'absolute';
      invoiceElement.style.left = '-9999px';

      html2canvas(invoiceElement, {
        scale: 2, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 550; 
        const pageHeight = 842; 
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 20; 

        pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 40); 

        while (heightLeft > 0) {
          position = - (imgHeight - heightLeft) - 20; 
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
          heightLeft -= (pageHeight - 40);
        }

        pdf.save(`${orderData.orderId}.pdf`);
        showToast('تم بدء تحميل ملف PDF.', 'success');
      }).catch(error => {
          console.error('Error generating PDF:', error);
          showToast('فشل في إنشاء ملف PDF.', 'error');
      }).finally(() => {
          invoiceElement.style.display = 'none';
          invoiceElement.style.position = '';
          invoiceElement.style.left = '';
      });
    }

    // Download Invoice as Image (Improved)
    function downloadInvoiceAsImage() {
        if (!orderData || !orderData.orderId) {
            showToast('بيانات الطلب غير متوفرة لتحميل الفاتورة.', 'error');
            return;
        }
        showToast('جاري تجهيز الصورة...', 'info');
        const invoiceElement = document.getElementById('invoiceTemplate');

        invoiceElement.style.display = 'block';
        invoiceElement.style.position = 'absolute';
        invoiceElement.style.left = '-9999px';

        html2canvas(invoiceElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            try {
                const link = document.createElement('a');
                link.download = `${orderData.orderId}.png`;
                link.href = canvas.toDataURL('image/png'); 

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showToast('تم بدء تحميل الصورة.', 'success');
            } catch (error) {
                console.error('Error generating or downloading image:', error);
                showToast('حدث خطأ أثناء تحميل الصورة.', 'error');
            }
        }).catch(error => {
            console.error('html2canvas error:', error);
            showToast('فشل في تحويل الفاتورة إلى صورة.', 'error');
        }).finally(() => {
            invoiceElement.style.display = 'none';
            invoiceElement.style.position = '';
            invoiceElement.style.left = '';
        });
    }

    // --- Utility Functions ---
    function resetCart() {
      cart = [];
      saveCartToLocalStorage();
      updateCartDisplay(); // Update display to show empty cart message
    }

    function setMinPickupDate() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0'); 
        const dd = String(today.getDate()).padStart(2, '0');
        const minDate = `${yyyy}-${mm}-${dd}`;
        document.getElementById('pickupDate').setAttribute('min', minDate);
        document.getElementById('pickupDate').value = minDate; // Set default to today
    }

    // Modal Helpers
    function openModal(modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (modal.id === 'cartModal') {
          updateCartDisplay();
      }
    }

    function closeModal(modal) {
      modal.classList.remove('active');
      const anyActiveModal = document.querySelector('.modal-overlay.active');
      if (!anyActiveModal) {
          document.body.style.overflow = '';
      }
    }

    // Toast Notification
    function showToast(message, type = 'info') {
      toast.textContent = message;
      toast.className = `toast ${type}`;
      toast.classList.add('show');

      if (toast.timer) clearTimeout(toast.timer);

      toast.timer = setTimeout(() => {
        toast.classList.remove('show');
        toast.timer = null;
      }, 3500); 
    }

    // Local Storage for Cart
    function saveCartToLocalStorage() {
      localStorage.setItem('eldaheehCart', JSON.stringify(cart));
    }

    function loadCartFromLocalStorage() {
      const savedCart = localStorage.getItem('eldaheehCart');
      if (savedCart) {
        try {
          cart = JSON.parse(savedCart);
          updateCartCount();
        } catch (error) {
          console.error('Error loading cart from local storage:', error);
          cart = [];
          localStorage.removeItem('eldaheehCart'); 
        }
      }
    }
