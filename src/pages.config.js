/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminReporting from './pages/AdminReporting';
import Calendar from './pages/Calendar';
import CashTracker from './pages/CashTracker';
import ClientBooking from './pages/ClientBooking';
import ClientDetails from './pages/ClientDetails';
import ClientHistory from './pages/ClientHistory';
import ClientList from './pages/ClientList';
import ClientPortal from './pages/ClientPortal';
import Inventory from './pages/Inventory';
import Payroll from './pages/Payroll';
import QuickCheckout from './pages/QuickCheckout';
import Reports from './pages/Reports';
import RunPayroll from './pages/RunPayroll';
import Settings from './pages/Settings';
import StaffSchedule from './pages/StaffSchedule';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminReporting": AdminReporting,
    "Calendar": Calendar,
    "CashTracker": CashTracker,
    "ClientBooking": ClientBooking,
    "ClientDetails": ClientDetails,
    "ClientHistory": ClientHistory,
    "ClientList": ClientList,
    "ClientPortal": ClientPortal,
    "Inventory": Inventory,
    "Payroll": Payroll,
    "QuickCheckout": QuickCheckout,
    "Reports": Reports,
    "RunPayroll": RunPayroll,
    "Settings": Settings,
    "StaffSchedule": StaffSchedule,
}

export const pagesConfig = {
    mainPage: "Calendar",
    Pages: PAGES,
    Layout: __Layout,
};