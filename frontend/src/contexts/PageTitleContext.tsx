import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTitleContextType {
  title: string;
  setTitle: (title: string) => void;
}

const PageTitleContext = createContext<PageTitleContextType>({
  title: '',
  setTitle: () => {},
});

const DEFAULT_ROUTE_TITLES: Record<string, string> = {
  '/salon/dashboard': 'Dashboard',
  '/salon/pos': 'POS',
  '/salon/sales': 'Transactions',
  '/salon/sales-hub': 'Sales',
  '/salon/quotations': 'Quotations',
  '/salon/quotations/new': 'New Quotation',
  '/salon/customers': 'Customers',
  '/salon/employees': 'Employees',
  '/salon/appointments': 'Appointments',
  '/salon/services': 'Services',
  '/salon/services-hub': 'Services',
  '/salon/service-categories': 'Service Categories',
  '/salon/products': 'Products',
  '/salon/product-categories': 'Product Categories',
  '/salon/stock': 'Stock Management',
  '/salon/inventory-hub': 'Inventory',
  '/salon/suppliers': 'Suppliers',
  '/salon/suppliers-hub': 'Suppliers',
  '/salon/grns': 'GRN / Purchases',
  '/salon/grns/new': 'New GRN',
  '/salon/supplier-payments': 'Supplier Payments',
  '/salon/supplier-outstanding': 'Supplier Outstanding',
  '/salon/expenses': 'Expenses',
  '/salon/expenses-hub': 'Expenses',
  '/salon/expense-categories': 'Expense Categories',
  '/salon/payroll/runs': 'Run Payroll',
  '/salon/payroll/advances': 'Salary Advances',
  '/salon/payroll/loans': 'Employee Loans',
  '/salon/payroll/payslips': 'Payslips',
  '/salon/payroll': 'Payroll',
  '/salon/reports': 'Reports',
  '/salon/reports-hub': 'Reports',
  '/salon/subscription': 'Subscription & Billing',
  '/salon/settings': 'Settings',
  '/salon/branches': 'Branches',
  '/salon/more': 'More',
};

export function resolveDefaultTitle(pathname: string): string {
  const clean = pathname.replace(/\/$/, '');
  if (DEFAULT_ROUTE_TITLES[clean]) return DEFAULT_ROUTE_TITLES[clean];

  if (clean.startsWith('/salon/quotations/') && clean.endsWith('/edit')) return 'Edit Quotation';
  if (clean.startsWith('/salon/quotations/')) return 'Quotation Details';
  if (clean.startsWith('/salon/grns/') && clean.endsWith('/edit')) return 'Edit GRN';
  if (clean.startsWith('/salon/grns/')) return 'GRN Details';
  if (clean.startsWith('/salon/sales/')) return 'Transaction Details';
  if (clean.startsWith('/salon/suppliers/')) return 'Supplier Details';

  return '';
}

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [customTitle, setCustomTitle] = useState('');
  const location = useLocation();

  // Reset custom title when route changes
  useEffect(() => {
    setCustomTitle('');
  }, [location.pathname]);

  const activeTitle = customTitle || resolveDefaultTitle(location.pathname);

  return (
    <PageTitleContext.Provider value={{ title: activeTitle, setTitle: setCustomTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle(): PageTitleContextType {
  return useContext(PageTitleContext);
}

/** Hook for pages to set their custom title */
export function useSetPageTitle(pageTitle: string) {
  const { setTitle } = usePageTitle();
  useEffect(() => {
    if (pageTitle) {
      setTitle(pageTitle);
    }
  }, [pageTitle, setTitle]);
}
