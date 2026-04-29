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

  const getStatusColor = (status) => {
    switch (status) {
        case 'Approved': return 'bg-emerald-100 text-emerald-700';
        case 'Rejected': return 'bg-rose-100 text-rose-700';
        default: return 'bg-amber-100 text-amber-700';
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">Supplier <span className="text-primary">Requests</span></h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Manage Partner Onboarding</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Business Name</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Applicant</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Phone</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">Loading requests...</td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">No applications found</td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req._id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-6 font-black text-sm text-slate-900">{req.businessName}</td>
                  <td className="p-6 text-sm font-bold text-slate-500">{req.fullName}</td>
                  <td className="p-6 text-sm font-bold text-slate-500">{req.phone}</td>
                  <td className="p-6">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => navigate(`/admin/supplier-requests/${req._id}`)}
                      className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-lg shadow-slate-900/10"
                    >
                      Review
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
