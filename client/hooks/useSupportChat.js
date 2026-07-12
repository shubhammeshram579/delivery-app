// 'use client';
// import { useState, useCallback, useEffect, useRef } from 'react';
// import { supportService } from '../services/index';
// import { useSocket } from './useSocket';

// export const useSupportChat = () => {
//   const { socket } = useSocket();

//   const [messages, setMessages] = useState([
//     { role: 'ai', text: "Hi! I'm your support assistant. How can I help you today?" },
//   ]);
//   const [ticketId, setTicketId] = useState(null);
//   const [ticketNumber, setTicketNumber] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [escalated, setEscalated] = useState(false);

//   const historyRef = useRef([]); // Keeps track of clean { senderType, message } context

//   // ── Join ticket room once escalated (for live admin replies) ──
//   useEffect(() => {
//     if (!ticketId || !socket?.current) return;
    
//     socket.current.emit('support:join', { ticketId });

//     const handler = (msg) => {
//       if (String(msg.ticketId) !== String(ticketId)) return;
      
//       setMessages((prev) => {
//         const exists = prev.some((m) => m.id === msg.id);
//         if (exists) return prev;
//         return [...prev, { 
//           role: msg.senderType === 'admin' ? 'admin' : 'user', 
//           text: msg.message, 
//           id: msg.id 
//         }];
//       });
//     };

//     socket.current.on('support:message', handler);
    
//     return () => {
//       socket.current?.off('support:message', handler);
//       socket.current?.emit('support:leave', { ticketId });
//     };
//   }, [ticketId, socket]);

//   // ── Send a message ────────────────────────────────────────
//   const sendMessage = useCallback(async (text) => {
//   if (!text.trim()) return;

//   setMessages((prev) => [...prev, { role: 'user', text }]);
//   setLoading(true);

//   try {
//     if (escalated && ticketId) {
//       if (socket?.current?.connected) {
//         socket.current.emit('support:message', { ticketId, message: text, senderType: 'customer' });
//       } else {
//         await supportService.replyToTicket(ticketId, text);
//       }
//       setLoading(false);
//       return;
//     }

//     const updatedHistory = [...historyRef.current, { senderType: 'customer', message: text.trim() }];
//     historyRef.current = updatedHistory;

//     // ── FIX 1: Safely extract Axios wrapper body ──
//     const response = await supportService.sendMessage({
//       message: text,
//       conversationHistory: updatedHistory,
//       ticketId,
//     });

//     // Safely extract the inner data object returned by your controller
//     const apiResult = response.data?.data || response.data; 

//     // console.log("apiResult",apiResult)

//     if (!apiResult) {
//       throw new Error("Empty payload received from server");
//     }

//     // ── FIX 2: Check explicit truthy validation ──
//     if (apiResult.resolved === true) {
//       setMessages((prev) => [...prev, { role: 'ai', text: apiResult.reply }]);
//       historyRef.current.push({ senderType: 'ai', message: apiResult.reply });
//     } else {
//       // Escalated to a live human support ticket
//       setMessages((prev) => [...prev, { 
//         role: 'ai', 
//         text: apiResult.reply || "Transferring you to a live agent...", 
//         isEscalation: true 
//       }]);
//       historyRef.current.push({ senderType: 'ai', message: apiResult.reply });
      
//       setTicketId(apiResult.ticketId);
//       setTicketNumber(apiResult.ticketNumber);
//       setEscalated(true);
//     }
//   } catch (err) {
//     console.error("[Support Hook Error]:", err);
//     setMessages((prev) => [...prev, { role: 'ai', text: 'Sorry, something went wrong. Please try again.' }]);
//   } finally {
//     setLoading(false);
//   }
// }, [escalated, ticketId, socket]);

//   // ── Force escalate ────────
//   const requestHuman = useCallback(async () => {
//     if (escalated) return;
//     setLoading(true);
//     try {
//       const compiledContext = messages
//         .filter((m) => m.role === 'user')
//         .map((m) => m.text)
//         .join(' | ') || 'Requesting human assistance';

//       const { data } = await supportService.createTicket({
//         category: 'other',
//         subject: 'Customer requested human support',
//         message: compiledContext,
//       });

//       setTicketId(data.ticket.id);
//       setTicketNumber(data.ticket.ticketNumber);
//       setEscalated(true);
//       setMessages((prev) => [...prev, {
//         role: 'ai',
//         text: `I've connected you with our support team. Ticket #${data.ticket.ticketNumber} has been created — someone will respond shortly.`,
//       }]);
//     } catch (err) {
//       console.error("[Manual Escalation Error]:", err);
//       setMessages((prev) => [...prev, { role: 'ai', text: 'Could not create a ticket right now. Please try again.' }]);
//     } finally {
//       setLoading(false);
//     }
//   }, [escalated, messages]);

//   return { messages, loading, ticketId, ticketNumber, escalated, sendMessage, requestHuman };
// };


'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { supportService } from '../services/index';
import { useSocket } from './useSocket';

export const useSupportChat = () => {
  const { socket, joinSupportTicket, leaveSupportTicket } = useSocket();

  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi! I'm your support assistant. How can I help you today?" },
  ]);
  const [ticketId, setTicketId] = useState(null);
  const [ticketNumber, setTicketNumber] = useState(null);
  const [loading, setLoading] = useState(false);
  const [escalated, setEscalated] = useState(false);

  const historyRef = useRef([]); // Keeps track of clean { senderType, message } context
  
  // ── FIX: Keep a mutable reference of ticketId to prevent stale event closures ──
  const ticketIdRef = useRef(null);
  useEffect(() => {
    ticketIdRef.current = ticketId;
  }, [ticketId]);

  // ── Join ticket room once escalated (for live admin replies) ──
  useEffect(() => {
    if (!ticketId || !socket?.current) return;
    
    // Explicitly call the dedicated abstraction from your updated useSocket hook
    if (typeof joinSupportTicket === 'function') {
      joinSupportTicket(ticketId);
    } else {
      socket.current.emit('support:join', { ticketId });
    }

    const handler = (msg) => {
      // Safely check against the mutable ref value so it never reads a stale state
      if (String(msg.ticketId) !== String(ticketIdRef.current)) return;
      
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === msg.id);
        if (exists) return prev;
        
        // Map backend sender names to frontend conversation roles safely
        let role = 'ai';
        if (msg.senderType === 'admin' || msg.senderType === 'agent') {
          role = 'admin';
        } else if (msg.senderType === 'customer' || msg.senderType === 'user') {
          role = 'user';
        }

        return [...prev, { 
          role, 
          text: msg.message, 
          id: msg.id 
        }];
      });
    };

    socket.current.on('support:message', handler);
    
    return () => {
      if (socket.current) {
        socket.current.off('support:message', handler);
        if (typeof leaveSupportTicket === 'function') {
          leaveSupportTicket(ticketId);
        } else {
          socket.current.emit('support:leave', { ticketId });
        }
      }
    };
  }, [ticketId, socket, joinSupportTicket, leaveSupportTicket]);

  // ── Send a message ────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      // If already connected to a human agent, pass directly down to the websocket pipeline
      if (escalated && ticketId) {
        if (socket?.current?.connected) {
          socket.current.emit('support:message', { ticketId, message: text, senderType: 'customer' });
        } else {
          await supportService.replyToTicket(ticketId, text);
        }
        setLoading(false);
        return;
      }

      const updatedHistory = [...historyRef.current, { senderType: 'customer', message: text.trim() }];
      historyRef.current = updatedHistory;

      // Safely extract Axios wrapper body
      const response = await supportService.sendMessage({
        message: text,
        conversationHistory: updatedHistory,
        ticketId,
      });

      const apiResult = response.data?.data || response.data; 

      if (!apiResult) {
        throw new Error("Empty payload received from server");
      }

      // Check explicit truthy validation 
      if (apiResult.resolved === true) {
        setMessages((prev) => [...prev, { role: 'ai', text: apiResult.reply }]);
        historyRef.current.push({ senderType: 'ai', message: apiResult.reply });
      } else {
        // Escalated to a live human support ticket
        setMessages((prev) => [...prev, { 
          role: 'ai', 
          text: apiResult.reply || "Transferring you to a live agent...", 
          isEscalation: true 
        }]);
        historyRef.current.push({ senderType: 'ai', message: apiResult.reply });
        
        setTicketId(apiResult.ticketId);
        setTicketNumber(apiResult.ticketNumber);
        setEscalated(true);
      }
    } catch (err) {
      console.error("[Support Hook Error]:", err);
      setMessages((prev) => [...prev, { role: 'ai', text: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [escalated, ticketId, socket]);

  // ── Force escalate ────────
  const requestHuman = useCallback(async () => {
    if (escalated) return;
    setLoading(true);
    try {
      const compiledContext = messages
        .filter((m) => m.role === 'user')
        .map((m) => m.text)
        .join(' | ') || 'Requesting human assistance';

      const { data } = await supportService.createTicket({
        category: 'other',
        subject: 'Customer requested human support',
        message: compiledContext,
      });

      const ticketData = data?.ticket || data;

      setTicketId(ticketData.id);
      setTicketNumber(ticketData.ticketNumber);
      setEscalated(true);
      setMessages((prev) => [...prev, {
        role: 'ai',
        text: `I've connected you with our support team. Ticket #${ticketData.ticketNumber} has been created — someone will respond shortly.`,
      }]);
    } catch (err) {
      console.error("[Manual Escalation Error]:", err);
      setMessages((prev) => [...prev, { role: 'ai', text: 'Could not create a ticket right now. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [escalated, messages]);

  return { messages, loading, ticketId, ticketNumber, escalated, sendMessage, requestHuman };
};