import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Filter, X, LogOut, User, Shield, Edit } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function ParaglidingSitesApp() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sites, setSites] = useState([]);
  const [pendingSites, setPendingSites] = useState([]);
  const [filterCountry, setFilterCountry] = useState('');
  const [filterState, setFilterState] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    loadSites();

    const authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        await checkIfAdmin(session.user.id);
      } else {
        setIsAdmin(false);
        setPendingSites([]);
      }
    });

    return () => {
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadPendingSites();
    }
  }, [isAdmin]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      await checkIfAdmin(user.id);
    }
  };

  const checkIfAdmin = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }
      
      if (data && data.is_admin) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error in checkIfAdmin:', error);
      setIsAdmin(false);
    }
  };

  const loadSites = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSites(data || []);
    } catch (error) {
      console.error('Error loading sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingSites = async () => {
    try {
      console.log('Loading pending sites...');
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading pending sites:', error);
        return;
      }
      
      console.log('Pending sites loaded:', data);
      setPendingSites(data || []);
    } catch (error) {
      console.error('Error in loadPendingSites:', error);
    }
  };

  const handleSignUp = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      alert('Account created! Please check your email to verify your account.');
      setShowAuthModal(false);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      setShowAuthModal(false);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const addSite = async (siteData) => {
    if (!user) {
      alert('Please log in to add a site');
      setShowAuthModal(true);
      return;
    }

    try {
      const siteToInsert = {
        ...siteData,
        user_id: user.id,
        is_approved: isAdmin
      };

      const { data, error } = await supabase
        .from('sites')
        .insert([siteToInsert])
        .select();
      
      if (error) throw error;
      
      if (isAdmin) {
        setSites(prev => [data[0], ...prev]);
        alert('Site added and approved!');
      } else {
        alert('Site submitted for approval!');
      }
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding site:', error);
      alert('Error adding site: ' + error.message);
    }
  };

  const editSite = async (siteId, updatedData) => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .update(updatedData)
        .eq('id', siteId)
        .select();
      
      if (error) throw error;
      
      setSites(prev => prev.map(s => s.id === siteId ? data[0] : s));
      setShowEditModal(false);
      setEditingSite(null);
      alert('Site updated successfully!');
    } catch (error) {
      console.error('Error updating site:', error);
      alert('Error updating site: ' + error.message);
    }
  };

  const approveSite = async (siteId) => {
    console.log('Approving site:', siteId);
    try {
      const { data, error } = await supabase
        .from('sites')
        .update({ is_approved: true })
        .eq('id', siteId)
        .select();
      
      console.log('Approve result:', { data, error });
      
      if (error) throw error;
      
      setPendingSites(prev => prev.filter(s => s.id !== siteId));
      setSites(prev => [data[0], ...prev]);
      alert('Site approved!');
    } catch (error) {
      console.error('Error approving site:', error);
      alert('Error approving site: ' + error.message);
    }
  };

  const rejectSite = async (siteId) => {
    if (!confirm('Are you sure you want to reject and delete this site?')) return;

    try {
      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', siteId);
      
      if (error) throw error;
      
      setPendingSites(prev => prev.filter(s => s.id !== siteId));
      alert('Site rejected and deleted.');
    } catch (error) {
      console.error('Error rejecting site:', error);
      alert('Error rejecting site: ' + error.message);
    }
  };

  const deleteSite = async (siteId) => {
    if (!confirm('Are you sure you want to delete this site?')) return;

    try {
      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', siteId);
      
      if (error) throw error;
      
      setSites(prev => prev.filter(s => s.id !== siteId));
      alert('Site deleted.');
    } catch (error) {
      console.error('Error deleting site:', error);
      alert('Error deleting site: ' + error.message);
    }
  };

  const handleEditClick = (site) => {
    setEditingSite(site);
    setShowEditModal(true);
  };

  const countries = [...new Set(sites.map(s => s.country))].sort();
  const states = filterCountry
    ? [...new Set(sites.filter(s => s.country === filterCountry).map(s => s.state))].sort()
    : [];

  const filteredSites = sites
    .filter(s => !filterCountry || s.country === filterCountry)
    .filter(s => !filterState || s.state === filterState)
    .filter(s => !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (showAdminPanel && isAdmin) {
    return <AdminPanel 
      pendingSites={pendingSites}
      onApprove={approveSite}
      onReject={rejectSite}
      onBack={() => setShowAdminPanel(false)}
    />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">Paragliding Sites</h1>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Site
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Shield className="w-4 h-4" />
                Admin ({pendingSites.length})
              </button>
            )}
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            ) : (
              <button
                onClick={() => { setShowAuthModal(true); setAuthMode('login'); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <User className="w-4 h-4" />
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Filter Sites</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <select
                value={filterCountry}
                onChange={(e) => { setFilterCountry(e.target.value); setFilterState(''); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Countries</option>
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State/Region</label>
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                disabled={!filterCountry}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">All States</option>
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading sites...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSites.map(site => (
              <div key={site.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">{site.name}</h3>
                <div className="text-sm text-gray-600 mb-3">
                  <p><strong>Country:</strong> {site.country}</p>
                  <p><strong>State:</strong> {site.state}</p>
                </div>
                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto mb-3">
                  {site.info || 'No additional information provided.'}
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClick(site)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteSite(site.id)}
                      className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && filteredSites.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No sites found. {user ? 'Be the first to add one!' : 'Log in to add a site!'}
          </div>
        )}
      </main>

      {showAddModal && (
        <SiteModal
          mode="add"
          onSubmit={addSite}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showEditModal && editingSite && (
        <SiteModal
          mode="edit"
          site={editingSite}
          onSubmit={(data) => editSite(editingSite.id, data)}
          onClose={() => {
            setShowEditModal(false);
            setEditingSite(null);
          }}
        />
      )}

      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onAuth={authMode === 'login' ? handleLogin : handleSignUp}
          onClose={() => setShowAuthModal(false)}
          onSwitchMode={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
        />
      )}
    </div>
  );
}

function SiteModal({ mode, site, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: site?.name || '',
    country: site?.country || '',
    state: site?.state || '',
    info: site?.info || ''
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.country || !formData.state) {
      alert('Please fill in all required fields');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {mode === 'add' ? 'Add New Paragliding Site' : 'Edit Paragliding Site'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Site Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State/Region *</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Site Information</label>
            <textarea
              value={formData.info}
              onChange={(e) => setFormData({ ...formData, info: e.target.value })}
              rows={8}
              placeholder="Enter any relevant information about this site..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {mode === 'add' ? 'Add Site' : 'Update Site'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthModal({ mode, onAuth, onClose, onSwitchMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }
    onAuth(email, password);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">{mode === 'login' ? 'Login' : 'Sign Up'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSubmit}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            {mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={onSwitchMode}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Login'}
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function AdminPanel({ pendingSites, onApprove, onReject, onBack }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" />
              Admin Panel - Pending Submissions
            </h2>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Back to Sites
            </button>
          </div>
          
          {pendingSites.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No pending submissions</p>
          ) : (
            <div className="space-y-4">
              {pendingSites.map(site => (
                <div key={site.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2">{site.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Location:</strong> {site.state}, {site.country}
                  </p>
                  <div className="bg-gray-50 p-3 rounded mb-3 max-h-32 overflow-y-auto text-sm">
                    {site.info || 'No additional information provided.'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onApprove(site.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onReject(site.id)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}