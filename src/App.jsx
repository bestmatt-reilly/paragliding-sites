import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Filter, X, LogOut, User, Shield, Edit, FileEdit, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function ParaglidingSitesApp() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sites, setSites] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [expandedSites, setExpandedSites] = useState([]);
  const [pendingSites, setPendingSites] = useState([]);
  const [editRequests, setEditRequests] = useState([]);
  const [filterCountry, setFilterCountry] = useState('');
  const [filterState, setFilterState] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [requestingEditSite, setRequestingEditSite] = useState(null);
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
        loadFavorites(session.user.id);
      } else {
        setIsAdmin(false);
        setPendingSites([]);
        setEditRequests([]);
        setFavorites([]);
      }
    });

    return () => {
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadPendingSites();
      loadEditRequests();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (user) {
      loadFavorites(user.id);
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      await checkIfAdmin(user.id);
      loadFavorites(user.id);
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

  const loadFavorites = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('site_id')
        .eq('user_id', userId);
      
      if (error) throw error;
      setFavorites(data.map(f => f.site_id));
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (e, siteId) => {
    e.stopPropagation();
    
    if (!user) {
      alert('Please log in to favorite sites');
      setShowAuthModal(true);
      return;
    }

    const isFavorited = favorites.includes(siteId);

    try {
      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('site_id', siteId);
        
        if (error) throw error;
        setFavorites(prev => prev.filter(id => id !== siteId));
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert([{ user_id: user.id, site_id: siteId }]);
        
        if (error) throw error;
        setFavorites(prev => [...prev, siteId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Error updating favorites');
    }
  };

  const toggleExpanded = (siteId) => {
    setExpandedSites(prev => 
      prev.includes(siteId) 
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  const loadPendingSites = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading pending sites:', error);
        return;
      }
      
      setPendingSites(data || []);
    } catch (error) {
      console.error('Error in loadPendingSites:', error);
    }
  };

  const loadEditRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('edit_requests')
        .select(`
          *,
          sites (
            name,
            country,
            state,
            info
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading edit requests:', error);
        return;
      }
      
      setEditRequests(data || []);
    } catch (error) {
      console.error('Error in loadEditRequests:', error);
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

  const submitEditRequest = async (siteId, proposedData) => {
    if (!user) {
      alert('Please log in to request edits');
      setShowAuthModal(true);
      return;
    }

    try {
      const { error } = await supabase
        .from('edit_requests')
        .insert([{
          site_id: siteId,
          user_id: user.id,
          proposed_name: proposedData.name,
          proposed_country: proposedData.country || '',
          proposed_state: proposedData.state || '',
          proposed_info: proposedData.info || ''
        }]);
      
      if (error) throw error;
      
      alert('Edit request submitted for admin review!');
      setShowEditRequestModal(false);
      setRequestingEditSite(null);
    } catch (error) {
      console.error('Error submitting edit request:', error);
      alert('Error submitting edit request: ' + error.message);
    }
  };

  const approveEditRequest = async (requestId, siteId, proposedData) => {
    try {
      const { error: updateError } = await supabase
        .from('sites')
        .update({
          name: proposedData.proposed_name,
          country: proposedData.proposed_country,
          state: proposedData.proposed_state,
          info: proposedData.proposed_info
        })
        .eq('id', siteId);
      
      if (updateError) throw updateError;

      const { error: deleteError } = await supabase
        .from('edit_requests')
        .delete()
        .eq('id', requestId);
      
      if (deleteError) throw deleteError;

      setEditRequests(prev => prev.filter(r => r.id !== requestId));
      loadSites();
      alert('Edit request approved and applied!');
    } catch (error) {
      console.error('Error approving edit request:', error);
      alert('Error approving edit request: ' + error.message);
    }
  };

  const rejectEditRequest = async (requestId) => {
    if (!confirm('Are you sure you want to reject this edit request?')) return;

    try {
      const { error } = await supabase
        .from('edit_requests')
        .delete()
        .eq('id', requestId);
      
      if (error) throw error;
      
      setEditRequests(prev => prev.filter(r => r.id !== requestId));
      alert('Edit request rejected.');
    } catch (error) {
      console.error('Error rejecting edit request:', error);
      alert('Error rejecting edit request: ' + error.message);
    }
  };

  const approveSite = async (siteId) => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .update({ is_approved: true })
        .eq('id', siteId)
        .select();
      
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

  const handleEditClick = (e, site) => {
    e.stopPropagation();
    setEditingSite(site);
    setShowEditModal(true);
  };

  const handleRequestEditClick = (e, site) => {
    e.stopPropagation();
    setRequestingEditSite(site);
    setShowEditRequestModal(true);
  };

  const countries = [...new Set(sites.map(s => s.country).filter(Boolean))].sort();
  const states = filterCountry
    ? [...new Set(sites.filter(s => s.country === filterCountry).map(s => s.state).filter(Boolean))].sort()
    : [];

  let filteredSites = sites
    .filter(s => !filterCountry || s.country === filterCountry)
    .filter(s => !filterState || s.state === filterState)
    .filter(s => !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (showFavoritesOnly) {
    filteredSites = filteredSites.filter(s => favorites.includes(s.id));
  }

  // Show admin panel if requested
  if (showAdminPanel && isAdmin) {
    return <AdminPanel 
      pendingSites={pendingSites}
      editRequests={editRequests}
      onApprove={approveSite}
      onReject={rejectSite}
      onApproveEdit={approveEditRequest}
      onRejectEdit={rejectEditRequest}
      onBack={() => setShowAdminPanel(false)}
    />;
  }

  // Show landing page if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400">
        <header className="bg-white bg-opacity-10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">Paragliding Sites</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setShowAuthModal(true); setAuthMode('login'); }}
                className="px-6 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-medium transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
                className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium transition-colors"
              >
                Sign Up
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="mb-12">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Discover Paragliding Sites<br />Around the World
            </h2>
            <p className="text-xl md:text-2xl text-white text-opacity-90 mb-8 max-w-3xl mx-auto">
              Access a comprehensive database of paragliding locations, share your favorite spots, and connect with the global paragliding community.
            </p>
            <button
              onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-bold text-lg transition-all transform hover:scale-105 shadow-xl"
            >
              Get Started - It's Free
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-8 text-white">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Browse Sites</h3>
              <p className="text-white text-opacity-90">
                Explore paragliding locations worldwide with detailed information and user reviews.
              </p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-8 text-white">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Save Favorites</h3>
              <p className="text-white text-opacity-90">
                Create your personal collection of favorite flying sites for quick access.
              </p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-8 text-white">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Contribute</h3>
              <p className="text-white text-opacity-90">
                Share new locations and help keep site information accurate and up-to-date.
              </p>
            </div>
          </div>
        </main>

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

  // Main app view for logged-in users
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">Paragliding Sites</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Site
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Shield className="w-4 h-4" />
                Admin ({pendingSites.length + editRequests.length})
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold">Filter Sites</h2>
            </div>
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showFavoritesOnly 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              {showFavoritesOnly ? 'Show All' : 'Favorites Only'}
            </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {filteredSites.map(site => {
              const isExpanded = expandedSites.includes(site.id);
              return (
                <div 
                  key={site.id} 
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                  <div 
                    onClick={() => toggleExpanded(site.id)}
                    className="p-6 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">{site.name}</h3>
                        {(site.country || site.state) && (
                          <p className="text-sm text-gray-600">
                            {[site.state, site.country].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={(e) => toggleFavorite(e, site.id)}
                          className={`${
                            favorites.includes(site.id) 
                              ? 'text-red-500' 
                              : 'text-gray-400 hover:text-red-500'
                          } transition-colors`}
                        >
                          <Heart className={`w-5 h-5 ${favorites.includes(site.id) ? 'fill-current' : ''}`} />
                        </button>
                        {(site.info || isAdmin || user) && (
                          isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-gray-200 pt-4">
                      {site.info && (
                        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded mb-3 max-h-48 overflow-y-auto">
                          {site.info}
                        </div>
                      )}
                      {isAdmin ? (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => handleEditClick(e, site)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSite(site.id); }}
                            className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      ) : user && (
                        <button
                          onClick={(e) => handleRequestEditClick(e, site)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                        >
                          <FileEdit className="w-4 h-4" />
                          Request Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredSites.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {showFavoritesOnly 
              ? 'No favorites yet. Click the heart icon on sites to save them!' 
              : 'No sites found. Be the first to add one!'
            }
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

      {showEditRequestModal && requestingEditSite && (
        <SiteModal
          mode="request"
          site={requestingEditSite}
          onSubmit={(data) => submitEditRequest(requestingEditSite.id, data)}
          onClose={() => {
            setShowEditRequestModal(false);
            setRequestingEditSite(null);
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
    if (!formData.name) {
      alert('Site name is required');
      return;
    }
    onSubmit(formData);
  };

  const getTitle = () => {
    if (mode === 'add') return 'Add New Paragliding Site';
    if (mode === 'edit') return 'Edit Paragliding Site';
    return 'Request Edit for Site';
  };

  const getButtonText = () => {
    if (mode === 'add') return 'Add Site';
    if (mode === 'edit') return 'Update Site';
    return 'Submit Edit Request';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{getTitle()}</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State/Region</label>
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
              {getButtonText()}
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

function AdminPanel({ pendingSites, editRequests, onApprove, onReject, onApproveEdit, onRejectEdit, onBack }) {
  const [activeTab, setActiveTab] = useState('sites');

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" />
              Admin Panel
            </h2>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Back to Sites
            </button>
          </div>

          <div className="flex gap-2 mb-6 border-b">
            <button
              onClick={() => setActiveTab('sites')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'sites'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending Sites ({pendingSites.length})
            </button>
            <button
              onClick={() => setActiveTab('edits')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'edits'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Edit Requests ({editRequests.length})
            </button>
          </div>

          {activeTab === 'sites' && (
            <>
              {pendingSites.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No pending site submissions</p>
              ) : (
                <div className="space-y-4">
                  {pendingSites.map(site => (
                    <div key={site.id} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-2">{site.name}</h3>
                      {site.country && site.state && (
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Location:</strong> {site.state}, {site.country}
                        </p>
                      )}
                      {site.info && (
                        <div className="bg-gray-50 p-3 rounded mb-3 max-h-32 overflow-y-auto text-sm">
                          {site.info}
                        </div>
                      )}
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
            </>
          )}

          {activeTab === 'edits' && (
            <>
              {editRequests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No pending edit requests</p>
              ) : (
                <div className="space-y-4">
                  {editRequests.map(request => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3">Edit Request</h3>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-red-50 p-3 rounded">
                          <h4 className="font-semibold text-sm text-red-800 mb-2">Current</h4>
                          <p className="text-sm mb-1"><strong>Name:</strong> {request.sites?.name}</p>
                          <p className="text-sm mb-1"><strong>Country:</strong> {request.sites?.country || 'None'}</p>
                          <p className="text-sm mb-1"><strong>State:</strong> {request.sites?.state || 'None'}</p>
                          <p className="text-sm"><strong>Info:</strong> {request.sites?.info || 'None'}</p>
                        </div>

                        <div className="bg-green-50 p-3 rounded">
                          <h4 className="font-semibold text-sm text-green-800 mb-2">Proposed</h4>
                          <p className="text-sm mb-1"><strong>Name:</strong> {request.proposed_name}</p>
                          <p className="text-sm mb-1"><strong>Country:</strong> {request.proposed_country || 'None'}</p>
                          <p className="text-sm mb-1"><strong>State:</strong> {request.proposed_state || 'None'}</p>
                          <p className="text-sm"><strong>Info:</strong> {request.proposed_info || 'None'}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => onApproveEdit(request.id, request.site_id, request)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Approve Edit
                        </button>
                        <button
                          onClick={() => onRejectEdit(request.id)}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Reject Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}