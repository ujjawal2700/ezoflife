import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Clock, CheckCircle2, AlertCircle, Search, Filter, ArrowRight, User, Send, Loader2, Info } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { ticketApi, adminApi } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function HelpDesk() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Chat Settings States
  const [showSettings, setShowSettings] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('activeTab') || 'Customer'); // Customer, Vendor, Supplier
  
  useEffect(() => {
    const tab = searchParams.get('activeTab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);
  
  // Filtering States
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  const chatEndRef = useRef(null);

  const fetchAllTickets = async () => {
    try {
      setLoading(true);
      const data = await ticketApi.getAllTickets();
      setTickets(data);
      
      // Auto-select first ticket of the active category
      const filtered = data.filter(t => (t.customer?.role || 'Customer') === activeTab);
      if (filtered.length > 0 && (!selectedTicket || (selectedTicket.customer?.role || 'Customer') !== activeTab)) {
        const detailedTicket = await ticketApi.getTicketDetails(filtered[0]._id);
        setSelectedTicket(detailedTicket);
      } else if (filtered.length === 0) {
        setSelectedTicket(null);
      }
    } catch (err) {
      console.error('Error fetching admin tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigs = async () => {
    try {
      const configs = await adminApi.getConfigs();
      const chatConfig = configs.find(c => c.key === 'chat_welcome_message');
      if (chatConfig) setWelcomeMessage(chatConfig.value);
    } catch (err) {
      console.error('Error fetching chat config:', err);
    }
  };

  useEffect(() => {
    fetchAllTickets();
    fetchConfigs();
  }, [activeTab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages]);

  const handleSelectTicket = async (ticket) => {
    try {
      const detailed = await ticketApi.getTicketDetails(ticket._id);
      setSelectedTicket(detailed);
    } catch (err) {
      console.error('Error fetching ticket details:', err);
    }
  };

  const handleSendAdminReply = async () => {
    if (!adminMessage.trim() || !selectedTicket) return;
    try {
      setIsSending(true);
      // Using a hardcoded admin ID for now or from auth if available
      const adminId = '673966843120ade7183e719b'; // Fallback to current user ID
      const res = await ticketApi.sendMessage(selectedTicket._id, {
        sender: adminId,
        senderRole: 'Admin',
        message: adminMessage
      });
      
      // Update local state
      const updatedDetailed = await ticketApi.getTicketDetails(selectedTicket._id);
      setSelectedTicket(updatedDetailed);
      setAdminMessage('');
      
      // Refresh list to update status/last message
      const listData = await ticketApi.getAllTickets();
      setTickets(listData);
    } catch (err) {
      alert('Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    try {
      await ticketApi.updateTicketStatus(selectedTicket._id, 'Resolved');
      const detailed = await ticketApi.getTicketDetails(selectedTicket._id);
      setSelectedTicket(detailed);
      const listData = await ticketApi.getAllTickets();
      setTickets(listData);
    } catch (err) {
      alert('Failed to resolve ticket');
    }
  };

  const handleSaveConfig = async () => {
    try {
      setIsSavingConfig(true);
      await adminApi.updateConfig({
        key: 'chat_welcome_message',
        value: welcomeMessage
      });
      toast.success('Chat welcome message updated');
      setShowSettings(false);
    } catch (err) {
      toast.error('Failed to update chat settings');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesRole = (t.customer?.role || 'Customer') === activeTab;
      const isDispute = ['Missing Items', 'Damaged Items', 'Wrong Items'].includes(t.category);
      if (isDispute) return false;
      
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
      const matchesSearch = searchQuery === '' || 
        t._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customer?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customer?.phone?.includes(searchQuery);

      return matchesRole && matchesStatus && matchesCategory && matchesSearch;
    });
  }, [tickets, activeTab, statusFilter, categoryFilter, searchQuery]);

  const categories = useMemo(() => {
    const allCats = tickets
      .filter(t => (t.customer?.role || 'Customer') === activeTab)
      .filter(t => !['Missing Items', 'Damaged Items', 'Wrong Items'].includes(t.category))
      .map(t => t.category);
    return ['All', ...new Set(allCats)];
  }, [tickets, activeTab]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50/50 overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader 
          title="Help Desk" 
          actions={[
            { label: 'Chat Automation', icon: MessageSquare, variant: 'secondary', onClick: () => setShowSettings(true) },
            { label: 'Refresh Feed', icon: Clock, variant: 'secondary', onClick: fetchAllTickets }
          ]}
        />

        <div className="bg-white px-8 border-b border-slate-200">
          <div className="flex gap-10">
            {['Customer', 'Vendor', 'Supplier'].map(tab => (
              <button 
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchParams({ activeTab: tab });
                }}
                className={`py-4 text-[10px] font-black uppercase tracking-[0.2em] relative transition-all ${activeTab === tab ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab} Issues
                {activeTab === tab && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden divide-x divide-slate-200 bg-white border-t border-slate-200">
        
        {/* Ticket List Sidebar */}
        <div className="w-full lg:w-[450px] flex flex-col bg-white overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
             <div className="relative flex-1">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="SEARCH TICKETS..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[9px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-slate-900 transition-all"
                />
             </div>
             <button 
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`p-3 border rounded-sm transition-all ${showFilterPanel ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-950 hover:text-white'}`}
              >
                <Filter size={14} />
             </button>
          </div>

          {/* Filter Panel */}
          {showFilterPanel && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="px-6 pb-6 border-b border-slate-100 bg-slate-50/30 space-y-4"
            >
               <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                     <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                     <select 
                       value={statusFilter}
                       onChange={(e) => setStatusFilter(e.target.value)}
                       className="w-full bg-white border border-slate-200 rounded-sm p-2 text-[9px] font-black uppercase outline-none focus:border-slate-900"
                     >
                        <option value="All">All Status</option>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                     </select>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                     <select 
                       value={categoryFilter}
                       onChange={(e) => setCategoryFilter(e.target.value)}
                       className="w-full bg-white border border-slate-200 rounded-sm p-2 text-[9px] font-black uppercase outline-none focus:border-slate-900"
                     >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                     </select>
                  </div>
               </div>
               <button 
                 onClick={() => {
                   setStatusFilter('All');
                   setCategoryFilter('All');
                   setSearchQuery('');
                 }}
                 className="w-full py-2 bg-slate-200 text-slate-600 text-[8px] font-black uppercase tracking-widest hover:bg-slate-300 transition-all rounded-sm"
               >
                 Clear All Filters
               </button>
            </motion.div>
          )}

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="p-20 text-center opacity-40">
                <Loader2 size={32} className="animate-spin mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Polling Database...</p>
              </div>
            ) : filteredTickets.length > 0 ? (
              filteredTickets.map(ticket => (
                <div 
                  key={ticket._id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={`p-6 cursor-pointer hover:bg-slate-50 transition-all relative group ${selectedTicket?._id === ticket._id ? 'bg-slate-50' : ''}`}
                >
                  {selectedTicket?._id === ticket._id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-900"></div>}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-900 tabular-nums">#{ticket?._id?.slice(-6).toUpperCase() || '...'}</span>
                      <span className={`px-1.5 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest ${
                        ticket.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' : 
                        ticket.status === 'Open' ? 'bg-amber-50 text-amber-600' : 
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                      {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight mb-2 group-hover:translate-x-1 transition-transform">{ticket.subject}</h4>
                  <div className="flex items-center gap-3">
                     <div className="flex items-center gap-1.5 opacity-60">
                      <User size={10} className="text-slate-400" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {ticket.customer?.displayName || ticket.customer?.name || `Unknown ${activeTab}`} 
                        <span className="ml-2 px-1 bg-slate-100 text-[7px] text-slate-400 rounded-sm">
                          {ticket.customer?.role || 'Customer'}
                        </span>
                      </span>
                     </div>
                     <div className="flex items-center gap-1.5 opacity-60">
                        <MessageSquare size={10} className="text-slate-400" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{ticket.category}</span>
                     </div>
                  </div>
                </div>
              ))
            ) : (
                <div className="p-20 text-center opacity-20">
                  <p className="text-[10px] font-black uppercase tracking-widest">No Active Tickets</p>
                </div>
            )}
          </div>
        </div>

        {/* Conversation View */}
        <div className="hidden lg:flex flex-1 flex-col bg-slate-50 relative">
          {selectedTicket ? (
            <>
              {/* Context Header */}
              <div className="p-8 bg-white border-b border-slate-100 flex justify-between items-start">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-sm flex items-center justify-center">
                       <User size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">{selectedTicket.customer?.displayName || selectedTicket.customer?.name}</h2>
                      <div className="flex items-center gap-3 mt-1.5">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{selectedTicket.customer?.phone} · ROLE: {activeTab.toUpperCase()} · STATUS: {selectedTicket.status}</span>
                      </div>
                    </div>
                 </div>
                 <div className="flex gap-2.5">
                    <button className="px-4 py-2 bg-white border border-slate-200 text-slate-900 text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all rounded-sm flex items-center gap-2">
                       Contact User
                    </button>
                    {selectedTicket.status !== 'Resolved' && (
                      <button 
                        onClick={handleResolveTicket}
                        className="px-4 py-2 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest transition-all rounded-sm flex items-center gap-2"
                      >
                         Resolve Ticket
                      </button>
                    )}
                 </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-10 space-y-8">
                 <div className="flex flex-col items-center">
                    <span className="px-3 py-1 bg-slate-200 text-slate-500 rounded-full text-[8px] font-black uppercase tracking-[0.2em] mb-4">Ticket Lifecycle Initialized</span>
                 </div>
                 
                 {selectedTicket.messages.map((chat, idx) => (
                    <div key={idx} className={`flex gap-4 max-w-[80%] ${chat.senderRole === 'Admin' ? 'ml-auto flex-row-reverse' : ''}`}>
                       <div className={`w-8 h-8 rounded-sm flex-shrink-0 ${chat.senderRole === 'Admin' ? 'bg-slate-950' : 'bg-slate-200'} flex items-center justify-center text-[8px] text-white font-bold`}>
                         {chat.senderRole === 'Admin' ? 'AD' : (selectedTicket.customer?.role?.slice(0, 2).toUpperCase() || 'CU')}
                       </div>
                       <div className={`space-y-2 ${chat.senderRole === 'Admin' ? 'items-end flex flex-col' : ''}`}>
                          <div className={`p-5 rounded-sm shadow-sm ${chat.senderRole === 'Admin' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white border border-slate-100 text-slate-800'}`}>
                             <p className="text-[11px] font-bold leading-relaxed uppercase tracking-tight">
                               {chat.message}
                             </p>
                          </div>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                            {new Date(chat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                       </div>
                    </div>
                 ))}
                 <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-6 bg-white border-t border-slate-100">
                 <div className="relative">
                    <textarea 
                      placeholder="ENTER PROTOCOL RESPONSE..." 
                      className="w-full h-20 p-5 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-slate-900 transition-all resize-none"
                      value={adminMessage}
                      onChange={(e) => setAdminMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendAdminReply()}
                    />
                    <div className="absolute bottom-3 right-3 flex gap-2">
                       <button 
                        onClick={handleSendAdminReply}
                        disabled={isSending || !adminMessage.trim()}
                        className="px-5 py-1.5 bg-slate-900 text-white rounded-[1px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 flex items-center gap-2 disabled:opacity-50 transition-all"
                       >
                          {isSending ? 'Committing...' : 'Commit Msg'} <Send size={11} />
                       </button>
                    </div>
                 </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-20">
               <MessageSquare size={64} className="mb-6" />
               <p className="text-[12px] font-black uppercase tracking-[0.4em]">Awaiting Selection</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-md rounded-sm border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare size={18} className="text-emerald-400" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Chat Automation</h3>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-white/40 hover:text-white">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Initial Welcome Message</label>
                <textarea 
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="w-full h-32 p-5 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all resize-none"
                  placeholder="Enter the first message customers see..."
                />
                <div className="p-4 bg-slate-50 rounded-sm border border-slate-100">
                  <div className="flex gap-2 mb-2">
                    <Info size={12} className="text-slate-400" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Available Placeholders</span>
                  </div>
                  <code className="text-[9px] font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">{'{orderId}'}</code>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-2 leading-relaxed">
                    This message is automatically sent to customers when they open a new support chat for an order.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-6 py-3 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="flex-1 px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  {isSavingConfig ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
