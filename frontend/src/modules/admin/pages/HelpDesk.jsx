import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Search, User, Send, Loader2, ArrowLeft } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { ticketApi, adminApi } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function HelpDesk() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('activeTab') || 'Customer';
  
  // Filtering States
  const [nameFilter, setNameFilter] = useState('All');
  const [chatIdFilter, setChatIdFilter] = useState('All');
  const [timeFilter, setTimeFilter] = useState('All');
  
  const chatEndRef = useRef(null);

  // Reset filters on tab change
  useEffect(() => {
    setNameFilter('All');
    setChatIdFilter('All');
    setTimeFilter('All');
    setIsMobileChatOpen(false);
  }, [activeTab]);

  const fetchAllTickets = async () => {
    try {
      setLoading(true);
      const data = await ticketApi.getAllTickets();
      setTickets(data);
      
      // Auto-select first ticket of the active tab (excluding disputes)
      const filtered = data.filter(t => 
        (t.customer?.role || 'Customer') === activeTab &&
        !['Missing Items', 'Damaged Items', 'Wrong Items'].includes(t.category)
      );
      if (filtered.length > 0) {
        const detailedTicket = await ticketApi.getTicketDetails(filtered[0]._id);
        setSelectedTicket(detailedTicket);
      } else {
        setSelectedTicket(null);
      }
    } catch (err) {
      console.error('Error fetching admin tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTickets();
  }, [activeTab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages]);

  const handleSelectTicket = async (ticket) => {
    try {
      const detailed = await ticketApi.getTicketDetails(ticket._id);
      setSelectedTicket(detailed);
      setIsMobileChatOpen(true);
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
  // Time checking helpers
  const isToday = (dateString) => {
    const today = new Date();
    const date = new Date(dateString);
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isYesterday = (dateString) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = new Date(dateString);
    return date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();
  };

  const isWithinLast7Days = (dateString) => {
    const date = new Date(dateString);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return date >= sevenDaysAgo;
  };

  const uniqueNames = useMemo(() => {
    const names = tickets
      .filter(t => (t.customer?.role || 'Customer') === activeTab)
      .filter(t => !['Missing Items', 'Damaged Items', 'Wrong Items'].includes(t.category))
      .map(t => t.customer?.displayName || t.customer?.ownerName || t.customer?.phone || 'Unknown User');
    return ['All', ...new Set(names)].sort();
  }, [tickets, activeTab]);

  const uniqueChatIds = useMemo(() => {
    const ids = tickets
      .filter(t => (t.customer?.role || 'Customer') === activeTab)
      .filter(t => !['Missing Items', 'Damaged Items', 'Wrong Items'].includes(t.category))
      .map(t => t._id);
    return ['All', ...new Set(ids)];
  }, [tickets, activeTab]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesRole = (t.customer?.role || 'Customer') === activeTab;
      const isDispute = ['Missing Items', 'Damaged Items', 'Wrong Items'].includes(t.category);
      if (isDispute) return false;
      
      const ticketName = t.customer?.displayName || t.customer?.ownerName || t.customer?.phone || 'Unknown User';
      const matchesName = nameFilter === 'All' || ticketName === nameFilter;
      
      const matchesChatId = chatIdFilter === 'All' || t._id === chatIdFilter;
      
      let matchesTime = true;
      const ticketDate = t.updatedAt || t.createdAt;
      if (timeFilter === 'Today') {
        matchesTime = isToday(ticketDate);
      } else if (timeFilter === 'Yesterday') {
        matchesTime = isYesterday(ticketDate);
      } else if (timeFilter === 'Last 7 Days') {
        matchesTime = isWithinLast7Days(ticketDate);
      }

      return matchesRole && matchesName && matchesChatId && matchesTime;
    });
  }, [tickets, activeTab, nameFilter, chatIdFilter, timeFilter]);
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50/50 overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader 
          title="Help Desk" 
        />
      </div>

      <div className="flex flex-1 overflow-hidden divide-x divide-slate-200 bg-white border-t border-slate-200">
        
        {/* Ticket List Sidebar */}
        <div className={`w-full lg:w-[450px] flex flex-col bg-white overflow-hidden ${isMobileChatOpen ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-6 border-b border-slate-100">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Name</label>
                <select
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-sm text-[9px] font-black uppercase tracking-wider outline-none focus:bg-white focus:border-slate-900 transition-all cursor-pointer text-slate-800"
                >
                  {uniqueNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Chat ID</label>
                <select
                  value={chatIdFilter}
                  onChange={(e) => setChatIdFilter(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-sm text-[9px] font-black uppercase tracking-wider outline-none focus:bg-white focus:border-slate-900 transition-all cursor-pointer text-slate-800"
                >
                  {uniqueChatIds.map((id) => (
                    <option key={id} value={id}>
                      {id === 'All' ? 'ALL' : `#${id.slice(-6).toUpperCase()}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Time</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-sm text-[9px] font-black uppercase tracking-wider outline-none focus:bg-white focus:border-slate-900 transition-all cursor-pointer text-slate-800"
                >
                  <option value="All">ALL</option>
                  <option value="Today">TODAY</option>
                  <option value="Yesterday">YESTERDAY</option>
                  <option value="Last 7 Days">LAST 7 DAYS</option>
                </select>
              </div>
            </div>
          </div>



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
                        {ticket.customer?.displayName || ticket.customer?.ownerName || ticket.customer?.phone || `Unknown User`} 
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
        <div className={`flex-1 flex-col bg-slate-50 relative ${isMobileChatOpen ? 'flex' : 'hidden lg:flex'}`}>
          {selectedTicket ? (
            <>
              {/* Context Header */}
              <div className="p-8 bg-white border-b border-slate-100 flex justify-between items-start">
                 <div className="flex items-center gap-5">
                     <button 
                       onClick={() => setIsMobileChatOpen(false)}
                       className="lg:hidden p-1 -ml-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors"
                     >
                       <ArrowLeft size={20} />
                     </button>
                     <div>
                       <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">{selectedTicket.customer?.displayName || selectedTicket.customer?.ownerName || selectedTicket.customer?.phone || 'Unknown User'}</h2>
                        {selectedTicket.customer?.phone && (
                          <div className="flex items-center gap-3 mt-1.5">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{selectedTicket.customer?.phone}</span>
                          </div>
                        )}
                     </div>
                 </div>
                 <div className="flex gap-2.5">
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
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest self-center flex-shrink-0">
                          {chat.senderRole === 'Admin' ? 'Admin' : (selectedTicket.customer?.displayName || selectedTicket.customer?.ownerName || selectedTicket.customer?.phone || 'User')}
                        </span>
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
                      placeholder="ENTER MESSAGE..." 
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
                          {isSending ? 'Sending...' : 'Send'} <Send size={11} />
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


    </div>
  );
}
