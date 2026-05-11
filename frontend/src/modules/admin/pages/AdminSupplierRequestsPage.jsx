import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BASE_URL } from '../../../lib/api';

const AdminSupplierRequestsPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
        const response = await fetch(`${BASE_URL}/supplier/requests`);
        const data = await response.json();
        if (Array.isArray(data)) {
            setRequests(data);
        } else {
            console.error('Invalid data format received:', data);
            setRequests([]);
        }
    } catch (error) {
        console.error('Fetch Supplier Requests Error:', error);
        setRequests([]);
    } finally {
        setLoading(false);
    }
  };

  const getStageColor = (stage) => {
    switch (stage) {
        case 'Initial_Approval_Pending': return 'bg-amber-100 text-amber-700';
        case 'Product_Selection_Phase': return 'bg-blue-100 text-blue-700';
        case 'Final_Approval_Pending': return 'bg-purple-100 text-purple-700';
        case 'Onboarded': return 'bg-emerald-100 text-emerald-700';
        default: return 'bg-slate-100 text-slate-700';
    }
  };

  const formatStageName = (stage) => {
    return stage?.replace(/_/g, ' ') || 'Unknown';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Supplier <span className="text-primary">Onboarding</span></h1>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Multi-Stage Application Management</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Business Identity</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Current Phase</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">Loading applications...</td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">No applications found</td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req._id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-6">
                    <div className="font-black text-sm text-slate-900 uppercase">{req.registeredBusinessName}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">{req.contactPersonName} • {req.user?.phone || 'No Phone'}</div>
                  </td>
                  <td className="p-6">
                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500">
                        {req.entityType}
                    </span>
                  </td>
                  <td className="p-6">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${getStageColor(req.onboardingStage)}`}>
                      {formatStageName(req.onboardingStage)}
                    </span>
                  </td>
                  <td className="p-6">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${req.status === 'Approved' ? 'text-emerald-500' : req.status === 'Rejected' ? 'text-rose-500' : 'text-amber-500'}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => navigate(`/admin/supplier-requests/${req._id}`)}
                      className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-lg shadow-slate-900/10"
                    >
                      Process Phase
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminSupplierRequestsPage;
