import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ImportConfig from './pages/ImportConfig';
import ProcurementDashboard from './pages/procurement/ProcurementDashboard';
import Suppliers from './pages/procurement/Suppliers';
import SupplierOffers from './pages/procurement/SupplierOffers';
import SupplierOfferDetail from './pages/procurement/SupplierOfferDetail';
import PurchaseOrders from './pages/procurement/PurchaseOrders';
import PurchaseOrderDetail from './pages/procurement/PurchaseOrderDetail';
import Connectors from './pages/Connectors';
import SalesIndexImport from './pages/SalesIdexImport';
import SalesRanking from './pages/SalesRanking';
import ComparativeAnalysis from './pages/ComparativeAnalysis';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Login from '@/pages/Login';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Si no está autenticado, mostrar login
  if (authError?.type === 'auth_required') {
    return <Login />;
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/ImportConfig" element={<LayoutWrapper currentPageName="ImportConfig"><ImportConfig /></LayoutWrapper>} />
      <Route path="/Connectors" element={<LayoutWrapper currentPageName="Connectors"><Connectors /></LayoutWrapper>} />
      <Route path="/SalesIndexImport" element={<LayoutWrapper currentPageName="SalesIndexImport"><SalesIndexImport /></LayoutWrapper>} />
      <Route path="/SalesRanking" element={<LayoutWrapper currentPageName="SalesRanking"><SalesRanking /></LayoutWrapper>} />
      <Route path="/ComparativeAnalysis" element={<LayoutWrapper currentPageName="ComparativeAnalysis"><ComparativeAnalysis /></LayoutWrapper>} />
      <Route path="/procurement/Suppliers" element={<LayoutWrapper currentPageName="procurement/Suppliers"><Suppliers /></LayoutWrapper>} />
      <Route path="/procurement/ProcurementDashboard" element={<LayoutWrapper currentPageName="procurement/ProcurementDashboard"><ProcurementDashboard /></LayoutWrapper>} />
      <Route path="/procurement/SupplierOffers" element={<LayoutWrapper currentPageName="procurement/SupplierOffers"><SupplierOffers /></LayoutWrapper>} />
      <Route path="/procurement/SupplierOfferDetail/:id" element={<LayoutWrapper currentPageName="procurement/SupplierOfferDetail"><SupplierOfferDetail /></LayoutWrapper>} />
      <Route path="/procurement/PurchaseOrders" element={<LayoutWrapper currentPageName="procurement/PurchaseOrders"><PurchaseOrders /></LayoutWrapper>} />
      <Route path="/procurement/PurchaseOrderDetail/:id" element={<LayoutWrapper currentPageName="procurement/PurchaseOrderDetail"><PurchaseOrderDetail /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App