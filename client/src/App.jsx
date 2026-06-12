import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import UserLayout from './layouts/UserLayout';
import AdminDashboard from './pages/admin/Dashboard';
import Settings from './pages/admin/Settings';
import UserManage from './pages/admin/UserManage';
import Companies from './pages/admin/Companies';
import Clients from './pages/admin/Clients';
import Products from './pages/admin/Products';
import StockIn from './pages/admin/StockIn';
import StockOut from './pages/admin/StockOut';
import Expenses from './pages/admin/Expenses';
import DataCenter from './pages/admin/DataCenter';
import AdminWarehouses from './pages/admin/Warehouses';
import UserDashboard from './pages/user/Dashboard';
import ChangePassword from './pages/user/ChangePassword';
import ProductList from './pages/user/ProductList';
import ExpenseList from './pages/user/ExpenseList';
import UserDataCenter from './pages/user/DataCenter';
import UserStockInList from './pages/user/StockInList';
import UserStockOutList from './pages/user/StockOutList';
import UserWarehouseList from './pages/user/WarehouseList';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="users" element={<UserManage />} />
          <Route path="companies" element={<Companies />} />
          <Route path="clients" element={<Clients />} />
          <Route path="products" element={<Products />} />
          <Route path="stock-in" element={<StockIn />} />
          <Route path="stock-out" element={<StockOut />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="data-center" element={<DataCenter />} />
          <Route path="warehouses" element={<AdminWarehouses />} />
        </Route>
        <Route path="/user" element={<PrivateRoute><UserLayout /></PrivateRoute>}>
          <Route index element={<UserDashboard />} />
          <Route path="password" element={<ChangePassword />} />
          <Route path="products" element={<ProductList />} />
          <Route path="stock-in" element={<UserStockInList />} />
          <Route path="stock-out" element={<UserStockOutList />} />
          <Route path="expenses" element={<ExpenseList />} />
          <Route path="data-center" element={<UserDataCenter />} />
          <Route path="warehouses" element={<UserWarehouseList />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
