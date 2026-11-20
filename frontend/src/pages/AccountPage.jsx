import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { api } from '../services/api.js';

export default function AccountPage({ user, onSignedIn, onSignOut }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.getOrders().then((result) => setOrders(result.orders)).catch((caught) => setError(caught.message));
  }, [user]);

  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const result = mode === 'register' ? await api.register(form) : await api.login({ email: form.email, password: form.password });
      onSignedIn(result);
    } catch (caught) { setError(caught.message); }
    finally { setBusy(false); }
  }

  if (user) return (
    <section>
      <div className="page-heading"><p className="eyebrow">CUSTOMER ACCOUNT</p><h1>Hello, {user.name}</h1><p>{user.email}</p><button className="button secondary" onClick={onSignOut}>Sign out</button></div>
      <h2>Your orders</h2>
      {orders.length === 0 ? <StatusMessage>You have no orders yet. <Link to="/">Browse the catalog</Link>.</StatusMessage> : (
        <div className="order-list">{orders.map((order) => <article className="summary" key={order.id}><h3>Order #{order.id} · {order.status}</h3><p>{new Date(order.createdAt).toLocaleString()}</p><p>Total <strong>₱{Number(order.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></p><ul>{order.items.map((item) => <li key={item.id}>{item.quantity} × {item.product.name}</li>)}</ul></article>)}</div>
      )}
    </section>
  );

  return (
    <section className="account-layout">
      <form onSubmit={submit}>
        <p className="eyebrow">FICTIONAL CLASSROOM ACCOUNT</p><h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
        <StatusMessage type="error">{error}</StatusMessage>
        {mode === 'register' && <label>Full name<input autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} minLength="2" maxLength="80" required /></label>}
        <label>Email<input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
        <label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength="10" maxLength="128" required /></label>
        <button disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="button secondary" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create a new account' : 'I already have an account'}</button>
        <small>Use fictional details and a unique classroom password. No real payment is collected.</small>
      </form>
    </section>
  );
}
