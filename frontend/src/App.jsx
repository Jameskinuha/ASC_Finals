import React, { useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { useCart } from './context/CartContext.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import ProductDetailsPage from './pages/ProductDetailsPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import AssistantPage from './pages/AssistantPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import { api } from './services/api.js';

export default function App() {
  const { itemCount } = useCart();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shopsmart_user') || 'null'); } catch { return null; }
  });

  useEffect(() => {
    if (!localStorage.getItem('shopsmart_token')) return;
    api.getMe().then(({ user: currentUser }) => {
      localStorage.setItem('shopsmart_user', JSON.stringify(currentUser));
      setUser(currentUser);
    }).catch(() => {
      localStorage.removeItem('shopsmart_token');
      localStorage.removeItem('shopsmart_user');
      setUser(null);
    });
  }, []);

  function signedIn(result) {
    localStorage.setItem('shopsmart_token', result.token);
    localStorage.setItem('shopsmart_user', JSON.stringify(result.user));
    setUser(result.user);
  }

  function signOut() {
    localStorage.removeItem('shopsmart_token');
    localStorage.removeItem('shopsmart_user');
    setUser(null);
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="brand" to="/">ShopSmart</NavLink>
        <nav aria-label="Primary navigation">
          <NavLink to="/">Products</NavLink>
          <NavLink to="/assistant">AI Assistant</NavLink>
          <NavLink to="/cart">Cart ({itemCount})</NavLink>
          <NavLink to="/account">{user ? 'Account' : 'Sign in'}</NavLink>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/products/:productId" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage user={user} />} />
          <Route path="/account" element={<AccountPage user={user} onSignedIn={signedIn} onSignOut={signOut} />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <footer className="site-footer">
        ShopSmart classroom starter • Simulated purchases only
      </footer>
    </div>
  );
}
