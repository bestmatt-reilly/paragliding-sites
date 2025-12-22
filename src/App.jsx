import React, { useState, useEffect } from 'react';
import { MapPin, Heart, Plus, Filter, X } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function ParaglidingSitesApp() {
  const [sites, setSites] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [filterCountry, setFilterCountry] = useState('');
  const [filterState, setFilterState] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSites(data || []);
    } catch (error) {
      console.error('Error loading sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSite = async (siteData) => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .insert([siteData])
        .select();
      
      if (error) throw error;
      setSites(prev => [data[0], ...prev]);
      setShowAddModal(false);
      alert('Site added successfully!');
    } catch (error) {
      console.error('Error adding site:', error);
      alert('Error adding site. Please try again.');
    }
  };

  const countries = [...new Set(sites.map(s => s.country))].sort();
  const states = filterCountry
    ? [...new Set(sites.filter(s => s.country === filterCountry).map(s => s.state))].sort()
    : [];

  const filteredSites = sites
    .filter(s => !filterCountry || s.country === filterCountry)
    .filter(s => !filterState || s.state === filterState)
    .filter(s => !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">Paragliding Sites</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Site
          </button>
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
                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                  {site.info || 'No additional information provided.'}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredSites.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No sites found. Be the first to add one!
          </div>
        )}
      </main>

      {showAddModal && (
        <AddSiteModal
          onSubmit={addSite}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

function AddSiteModal({ onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    state: '',
    info: ''
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
          <h2 className="text-2xl font-bold">Add New Paragliding Site</h2>
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
              Add Site
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