
// ============================================
// GOOGLE APPS SCRIPT BACKEND
// Restaurant Group Ordering System
// ============================================

// Configuration
const CONFIG = {
  MENU_SHEET: 'Menu',
  ORDERS_SHEET: 'Orders',
  SESSIONS_SHEET: 'Sessions',
  SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId()
};

// ============================================
// WEB APP ENTRY POINT
// ============================================

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Group Dining Order Manager')
    .setFaviconUrl('https://www.gstatic.com/images/branding/product/1x/apps_script_48dp.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

// Include CSS and JS files
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================
// MENU FUNCTIONS
// ============================================

function getMenuData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const menuSheet = ss.getSheetByName(CONFIG.MENU_SHEET);

    if (!menuSheet) {
      return { success: false, error: 'Menu sheet not found' };
    }

    const data = menuSheet.getDataRange().getValues();
    const headers = data[0];
    const menuItems = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) { // If ID exists
        menuItems.push({
          id: row[0],
          category: row[1],
          name: row[2],
          price: row[3],
          description: row[4],
          vegetarian: row[5] === true || row[5] === 'TRUE',
          available: row[6] === true || row[6] === 'TRUE' || row[6] === ''
        });
      }
    }

    return { success: true, data: menuItems };
  } catch (error) {
    Logger.log('Error in getMenuData: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ============================================
// SESSION FUNCTIONS
// ============================================

function createNewSession(sessionName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sessionsSheet = ss.getSheetByName(CONFIG.SESSIONS_SHEET);

    if (!sessionsSheet) {
      return { success: false, error: 'Sessions sheet not found' };
    }

    const sessionId = 'SESSION_' + new Date().getTime();
    const timestamp = new Date();

    sessionsSheet.appendRow([
      sessionId,
      sessionName || 'Dinner Session',
      timestamp,
      'Active',
      0, // Total amount (will update later)
      '' // People (comma-separated list)
    ]);

    return { success: true, sessionId: sessionId };
  } catch (error) {
    Logger.log('Error in createNewSession: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function getActiveSession() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sessionsSheet = ss.getSheetByName(CONFIG.SESSIONS_SHEET);

    if (!sessionsSheet) {
      return { success: false, error: 'Sessions sheet not found' };
    }

    const data = sessionsSheet.getDataRange().getValues();

    // Find the most recent active session
    for (let i = data.length - 1; i > 0; i--) {
      if (data[i][3] === 'Active') {
        return {
          success: true,
          session: {
            sessionId: data[i][0],
            sessionName: data[i][1],
            startTime: data[i][2],
            status: data[i][3],
            totalAmount: data[i][4],
            people: data[i][5]
          }
        };
      }
    }

    // No active session found, create new one
    return createNewSession('New Dinner Session');
  } catch (error) {
    Logger.log('Error in getActiveSession: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ============================================
// ORDER FUNCTIONS
// ============================================

function addOrder(orderData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName(CONFIG.ORDERS_SHEET);

    if (!ordersSheet) {
      return { success: false, error: 'Orders sheet not found' };
    }

    const orderId = 'ORD_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
    const timestamp = new Date();

    ordersSheet.appendRow([
      orderId,
      orderData.sessionId,
      orderData.userName,
      orderData.itemId,
      orderData.itemName,
      orderData.category,
      orderData.quantity,
      orderData.pricePerItem,
      orderData.totalPrice,
      'Ordered', // Status
      timestamp, // Order time
      '', // Served time
      '' // Notes
    ]);

    return { 
      success: true, 
      orderId: orderId,
      message: 'Order added successfully'
    };
  } catch (error) {
    Logger.log('Error in addOrder: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function getAllOrders(sessionId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName(CONFIG.ORDERS_SHEET);

    if (!ordersSheet) {
      return { success: false, error: 'Orders sheet not found' };
    }

    const data = ordersSheet.getDataRange().getValues();
    const orders = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === sessionId) { // Match session ID
        orders.push({
          orderId: row[0],
          sessionId: row[1],
          userName: row[2],
          itemId: row[3],
          itemName: row[4],
          category: row[5],
          quantity: row[6],
          pricePerItem: row[7],
          totalPrice: row[8],
          status: row[9],
          orderTime: row[10],
          servedTime: row[11],
          notes: row[12],
          rowIndex: i + 1 // For updates
        });
      }
    }

    return { success: true, data: orders };
  } catch (error) {
    Logger.log('Error in getAllOrders: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function updateOrderStatus(orderId, newStatus, notes) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName(CONFIG.ORDERS_SHEET);

    if (!ordersSheet) {
      return { success: false, error: 'Orders sheet not found' };
    }

    const data = ordersSheet.getDataRange().getValues();

    // Find the order
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        const rowIndex = i + 1;

        // Update status
        ordersSheet.getRange(rowIndex, 10).setValue(newStatus);

        // If served, update served time
        if (newStatus === 'Served') {
          ordersSheet.getRange(rowIndex, 12).setValue(new Date());
        }

        // Update notes if provided
        if (notes) {
          ordersSheet.getRange(rowIndex, 13).setValue(notes);
        }

        return { 
          success: true, 
          message: 'Order status updated to ' + newStatus 
        };
      }
    }

    return { success: false, error: 'Order not found' };
  } catch (error) {
    Logger.log('Error in updateOrderStatus: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function deleteOrder(orderId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName(CONFIG.ORDERS_SHEET);

    if (!ordersSheet) {
      return { success: false, error: 'Orders sheet not found' };
    }

    const data = ordersSheet.getDataRange().getValues();

    // Find and delete the order
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        ordersSheet.deleteRow(i + 1);
        return { 
          success: true, 
          message: 'Order deleted successfully' 
        };
      }
    }

    return { success: false, error: 'Order not found' };
  } catch (error) {
    Logger.log('Error in deleteOrder: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ============================================
// BILL CALCULATION
// ============================================

function calculateBill(sessionId) {
  try {
    const ordersResult = getAllOrders(sessionId);

    if (!ordersResult.success) {
      return ordersResult;
    }

    const orders = ordersResult.data;
    const billSummary = {
      totalItems: 0,
      totalAmount: 0,
      servedAmount: 0,
      pendingAmount: 0,
      cancelledAmount: 0,
      byPerson: {},
      byCategory: {},
      byStatus: {
        Ordered: 0,
        Served: 0,
        'Not Available': 0
      }
    };

    orders.forEach(order => {
      billSummary.totalItems += order.quantity;
      billSummary.totalAmount += order.totalPrice;

      // By person
      if (!billSummary.byPerson[order.userName]) {
        billSummary.byPerson[order.userName] = 0;
      }
      billSummary.byPerson[order.userName] += order.totalPrice;

      // By category
      if (!billSummary.byCategory[order.category]) {
        billSummary.byCategory[order.category] = 0;
      }
      billSummary.byCategory[order.category] += order.totalPrice;

      // By status
      if (order.status === 'Served') {
        billSummary.servedAmount += order.totalPrice;
      } else if (order.status === 'Ordered') {
        billSummary.pendingAmount += order.totalPrice;
      } else if (order.status === 'Not Available') {
        billSummary.cancelledAmount += order.totalPrice;
      }

      billSummary.byStatus[order.status] = (billSummary.byStatus[order.status] || 0) + order.totalPrice;
    });

    return { 
      success: true, 
      summary: billSummary,
      orders: orders
    };
  } catch (error) {
    Logger.log('Error in calculateBill: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function closeSession(sessionId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sessionsSheet = ss.getSheetByName(CONFIG.SESSIONS_SHEET);

    if (!sessionsSheet) {
      return { success: false, error: 'Sessions sheet not found' };
    }

    const data = sessionsSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === sessionId) {
        sessionsSheet.getRange(i + 1, 4).setValue('Closed');

        // Calculate and update total amount
        const billResult = calculateBill(sessionId);
        if (billResult.success) {
          sessionsSheet.getRange(i + 1, 5).setValue(billResult.summary.servedAmount);
        }

        return { success: true, message: 'Session closed successfully' };
      }
    }

    return { success: false, error: 'Session not found' };
  } catch (error) {
    Logger.log('Error in closeSession: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}
