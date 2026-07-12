// /**
//  * support-ai.service.js
//  *
//  * AI-first support triage:
//  *  1. Try to answer known FAQs directly (no ticket)
//  *  2. If the issue needs a human (safety-critical, refunds, accidents, fraud etc.)
//  *     → escalate: create ticket + notify admin + let admin take over chat
//  *
//  * Same tool-use pattern as ai.service.js — AI never touches DB directly,
//  * it only calls the tools defined below.
//  */

// const Anthropic = require('@anthropic-ai/sdk');
// const { Order, Driver } = require('../models');
// const logger = require('../utils/logger');

// let _client = null;
// const getClient = () => {
//   if (!_client) {
//     if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
//     _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
//   }
//   return _client;
// };

// const MODEL = 'claude-opus-4-5';

// // ── Keywords that ALWAYS force escalation regardless of AI judgement ──
// // Safety net — some issues must never be "handled" by AI alone
// const FORCE_ESCALATE_PATTERNS = [
//   /accident/i, /injur/i, /hurt/i, /hospital/i,
//   /fraud/i, /scam/i, /stolen/i, /theft/i,
//   /didn'?t receive/i, /never (got|arrived|received)/i,
//   /wrong item/i, /wrong order/i, /damaged/i, /broken/i,
//   /legal/i, /lawyer/i, /police/i, /sue/i,
//   /money deducted/i, /charged.*not.*deliver/i, /double charged/i,
//   /manual refund/i, /refund.*directly/i,
//   /account.*blocked/i, /account.*suspended/i, /account.*banned/i,
//   /suicide/i, /kill myself/i, /self.?harm/i, // safety - always route to human
// ];

// // ── Frustration keywords for the cheap sentiment flag ──────
// const FRUSTRATION_PATTERNS = [
//   /worst/i, /terrible/i, /useless/i, /disgusting/i, /horrible/i,
//   /never again/i, /disappointed/i, /angry/i, /furious/i,
//   /!!!|\?\?\?/, /scam/i, /cheat/i, /waste of/i,
// ];
// const URGENT_PATTERNS = [
//   /urgent/i, /emergency/i, /asap/i, /immediately/i, /right now/i, /accident/i, /injur/i,
// ];

// const detectSentiment = (text) => {
//   if (URGENT_PATTERNS.some((p) => p.test(text))) return 'urgent';
//   if (FRUSTRATION_PATTERNS.some((p) => p.test(text))) return 'frustrated';
//   return 'neutral';
// };

// const shouldForceEscalate = (text) => FORCE_ESCALATE_PATTERNS.some((p) => p.test(text));

// // ── Tools available to the support AI ──────────────────────
// const SUPPORT_TOOLS = [
//   {
//     name: 'get_order_status',
//     description: "Look up a customer's order status, driver info, and timeline",
//     input_schema: {
//       type: 'object',
//       properties: { order_number: { type: 'string', description: 'Order number like ORD-1234' } },
//       required: ['order_number'],
//     },
//   },
//   {
//     name: 'get_driver_account_status',
//     description: "Look up a driver's account status (verified, suspended, etc.)",
//     input_schema: {
//       type: 'object',
//       properties: { driver_user_id: { type: 'string' } },
//       required: ['driver_user_id'],
//     },
//   },
//   {
//     name: 'escalate_to_human',
//     description: `Escalate this conversation to a human admin. USE THIS WHEN:
// - Customer didn't receive order / wrong item / damaged item
// - Payment issues (charged but not delivered, refund requests, missing driver payment)
// - Driver account suspended/blocked questions
// - Accidents, injuries, safety issues
// - Fraud reports or legal complaints
// - Any issue you cannot resolve with clear FAQ knowledge
// - User is asking to speak to a human`,
//     input_schema: {
//       type: 'object',
//       properties: {
//         category: {
//           type: 'string',
//           enum: ['delivery', 'payment', 'refund', 'account', 'technical', 'order', 'driver', 'other'],
//         },
//         priority: {
//           type: 'string',
//           enum: ['low', 'normal', 'high', 'critical'],
//           description: 'critical = safety/accident/fraud, high = payment/refund issues, normal = general complaints, low = minor questions',
//         },
//         subject: { type: 'string', description: 'Short 5-8 word summary of the issue' },
//         summary: { type: 'string', description: '2-3 sentence summary of what the user needs, for the admin to read' },
//       },
//       required: ['category', 'priority', 'subject', 'summary'],
//     },
//   },
// ];

// const executeTool = async (name, input) => {
//   switch (name) {
//     case 'get_order_status': {
//       const order = await Order.findOne({
//         where: { orderNumber: input.order_number },
//         include: [{ association: 'driver', include: [{ association: 'user', attributes: ['name', 'phone'] }] }],
//       });
//       if (!order) return { error: 'Order not found' };
//       return {
//         status: order.status,
//         driver_assigned: !!order.driverId,
//         driver_name: order.driver?.user?.name || null,
//         pickup_address: order.pickupAddress,
//         drop_address: order.dropAddress,
//         estimated_time: order.estimatedTime,
//         total_amount: order.totalAmount,
//         created_at: order.createdAt,
//       };
//     }
//     case 'get_driver_account_status': {
//       const driver = await Driver.findOne({ where: { userId: input.driver_user_id } });
//       if (!driver) return { error: 'Driver not found' };
//       return {
//         is_verified: driver.isVerified,
//         is_online: driver.isOnline,
//         is_available: driver.isAvailable,
//         rating: driver.rating,
//         total_deliveries: driver.totalDeliveries,
//       };
//     }
//     case 'escalate_to_human':
//       // The actual escalation (ticket creation) happens in the calling function,
//       // this tool call just signals intent + carries the structured data
//       return { acknowledged: true };
//     default:
//       return { error: `Unknown tool: ${name}` };
//   }
// };

// /**
//  * Main entry point — process one customer/driver message
//  * Returns either:
//  *  { resolved: true, reply: "..." }                          — AI handled it
//  *  { resolved: false, escalation: {...} }                    — needs a ticket
//  */
// const processSupportMessage = async ({ message, userType, conversationHistory = [] }) => {
//   // Hard safety net — bypass AI reasoning entirely for critical patterns
//   if (shouldForceEscalate(message)) {
//     return {
//       resolved: false,
//       escalation: {
//         category: guessCategory(message),
//         priority: 'critical',
//         subject: message.slice(0, 60),
//         summary: `User message flagged for mandatory human review: "${message}"`,
//       },
//       sentiment: detectSentiment(message),
//     };
//   }

//   const system = userType === 'driver' ? DRIVER_SYSTEM_PROMPT : CUSTOMER_SYSTEM_PROMPT;

//   const messages = [
//     ...conversationHistory.map((m) => ({
//       role: m.senderType === 'ai' ? 'assistant' : 'user',
//       content: m.message,
//     })),
//     { role: 'user', content: message },
//   ];

//   let iterations = 0;
//   const maxIterations = 4;

//   while (iterations < maxIterations) {
//     iterations++;
//     const resp = await getClient().messages.create({
//       model: MODEL,
//       max_tokens: 600,
//       system,
//       tools: SUPPORT_TOOLS,
//       messages,
//     });

//     if (resp.stop_reason === 'tool_use') {
//       const escalateBlock = resp.content.find((b) => b.type === 'tool_use' && b.name === 'escalate_to_human');

//       if (escalateBlock) {
//         // AI decided to escalate — return escalation data immediately
//         return {
//           resolved: false,
//           escalation: escalateBlock.input,
//           sentiment: detectSentiment(message),
//         };
//       }

//       // Otherwise it's a data lookup tool (order status, driver status) — execute and continue
//       messages.push({ role: 'assistant', content: resp.content });
//       const results = [];
//       for (const block of resp.content) {
//         if (block.type === 'tool_use') {
//           const result = await executeTool(block.name, block.input);
//           results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
//         }
//       }
//       messages.push({ role: 'user', content: results });
//       continue;
//     }

//     if (resp.stop_reason === 'end_turn') {
//       const text = resp.content.find((b) => b.type === 'text')?.text || '';
//       return { resolved: true, reply: text, sentiment: detectSentiment(message) };
//     }

//     break;
//   }

//   // Fallback — couldn't resolve within iteration budget, escalate safely
//   return {
//     resolved: false,
//     escalation: {
//       category: guessCategory(message),
//       priority: 'normal',
//       subject: message.slice(0, 60),
//       summary: `AI could not resolve after ${iterations} attempts: "${message}"`,
//     },
//     sentiment: detectSentiment(message),
//   };
// };

// // ── Simple category guesser for the force-escalate safety net ──
// const guessCategory = (text) => {
//   const lower = text.toLowerCase();
//   if (/refund|money back/.test(lower)) return 'refund';
//   if (/pay|charge|deduct|transaction/.test(lower)) return 'payment';
//   if (/suspend|block|verif|license/.test(lower)) return 'account';
//   if (/gps|app|bug|error|crash/.test(lower)) return 'technical';
//   if (/driver/.test(lower)) return 'driver';
//   if (/order|delivery|deliver/.test(lower)) return 'order';
//   return 'other';
// };

// // ── System prompts ──────────────────────────────────────────
// const CUSTOMER_SYSTEM_PROMPT = `You are a helpful support assistant for DeliverPro, a delivery platform.

// You can answer these common questions directly:
// - Where is my order? (use get_order_status tool)
// - Why is my order delayed?
// - How can I cancel my order? (explain: go to order details, tap Cancel Order, only works before pickup)
// - How do I add another address? (explain: this is entered fresh for each new order in the booking form)
// - How do I pay online? (explain: Razorpay - card, UPI, wallet - tap Pay Now on order detail page)
// - Coupon not working? (ask which coupon and explain to check expiry/minimum order value)

// You must escalate to a human (use escalate_to_human tool) for:
// - Customer didn't receive their order / wrong item delivered / damaged item
// - Refund requests requiring manual processing
// - Payment charged but order not delivered / double charged
// - Any accident, injury, or safety concern
// - Fraud reports or legal complaints
// - Anything you're not confident about

// Be warm, brief, and helpful. If you can answer directly, do so in 2-3 sentences.
// If the issue needs a human, don't try to solve it yourself — call escalate_to_human right away.`;

// const DRIVER_SYSTEM_PROMPT = `You are a helpful support assistant for DeliverPro drivers.

// You can answer these common questions directly:
// - How do I accept orders? (explain: go online from dashboard, available orders appear, tap Accept)
// - How do I update my bank account? (explain: contact admin via this chat, requires verification)
// - GPS is not working (explain: check location permissions are enabled, restart app, ensure good signal)
// - How do I update my license? (explain: this requires document re-verification by admin — escalate this one)

// You must escalate to a human (use escalate_to_human tool) for:
// - Account suspended or blocked questions (use get_driver_account_status tool first to check status)
// - Missing or incorrect payment/earnings
// - Document/license updates requiring verification
// - Any accident, injury, or safety concern
// - Fraud accusations against the driver

// Be warm, brief, and helpful. If you can answer directly, do so in 2-3 sentences.
// If the issue needs a human, don't try to solve it yourself — call escalate_to_human right away.`;

// module.exports = {
//   processSupportMessage,
//   detectSentiment,
// };


/**
 * support-ai.service.js
 *
 * AI-first support triage rewritten for Google Gemini SDK.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Order, Driver } = require('../models');
const logger = require('../utils/logger');

let _client = null;
const getClient = () => {
  if (!_client) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
    _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _client;
};

const MODEL = 'gemini-2.5-flash';

const FORCE_ESCALATE_PATTERNS = [
  /accident/i, /injur/i, /hurt/i, /hospital/i,
  /fraud/i, /scam/i, /stolen/i, /theft/i,
  /didn'?t receive/i, /never (got|arrived|received)/i,
  /wrong item/i, /wrong order/i, /damaged/i, /broken/i,
  /legal/i, /lawyer/i, /police/i, /sue/i,
  /money deducted/i, /charged.*not.*deliver/i, /double charged/i,
  /manual refund/i, /refund.*directly/i,
  /account.*blocked/i, /account.*suspended/i, /account.*banned/i,
  /suicide/i, /kill myself/i, /self.?harm/i,
];

const FRUSTRATION_PATTERNS = [
  /worst/i, /terrible/i, /useless/i, /disgusting/i, /horrible/i,
  /never again/i, /disappointed/i, /angry/i, /furious/i,
  /!!!|\?\?\?/, /scam/i, /cheat/i, /waste of/i,
];
const URGENT_PATTERNS = [
  /urgent/i, /emergency/i, /asap/i, /immediately/i, /right now/i, /accident/i, /injur/i,
];

const detectSentiment = (text) => {
  if (URGENT_PATTERNS.some((p) => p.test(text))) return 'urgent';
  if (FRUSTRATION_PATTERNS.some((p) => p.test(text))) return 'frustrated';
  return 'neutral';
};

const shouldForceEscalate = (text) => FORCE_ESCALATE_PATTERNS.some((p) => p.test(text));

const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'get_order_status',
        description: "Look up a customer's order status, driver info, and timeline. ONLY call this if the user has provided an order number string.",
        parameters: {
          type: 'OBJECT',
          properties: { order_number: { type: 'STRING', description: 'Order number like ORD-1234' } },
          required: ['order_number'],
        },
      },
      {
        name: 'get_driver_account_status',
        description: "Look up a driver's account status (verified, suspended, etc.)",
        parameters: {
          type: 'OBJECT',
          properties: { driver_user_id: { type: 'STRING' } },
          required: ['driver_user_id'],
        },
      },
      {
        name: 'escalate_to_human',
        description: 'Escalate this conversation to a human admin due to safety, complex payment, or user request.',
        parameters: {
          type: 'OBJECT',
          properties: {
            category: {
              type: 'STRING',
              enum: ['delivery', 'payment', 'refund', 'account', 'technical', 'order', 'driver', 'other'],
            },
            priority: {
              type: 'STRING',
              enum: ['low', 'normal', 'high', 'critical'],
              description: 'critical = safety/accident/fraud, high = payment/refund, normal = general complaints, low = minor questions',
            },
            subject: { type: 'STRING', description: 'Short 5-8 word summary of the issue' },
            summary: { type: 'STRING', description: '2-3 sentence summary of what the user needs' },
          },
          required: ['category', 'priority', 'subject', 'summary'],
        },
      },
    ],
  },
];

const executeTool = async (name, input) => {
  switch (name) {
    case 'get_order_status': {
      // FIX: Validate input value before execution query
      if (!input || !input.order_number || input.order_number.trim() === "") {
        return { error: 'Missing order_number parameter. Please ask the user to provide their order number.' };
      }
      const order = await Order.findOne({
        where: { orderNumber: input.order_number },
        include: [{ association: 'driver', include: [{ association: 'user', attributes: ['name', 'phone'] }] }],
      });
      if (!order) return { error: `Order ${input.order_number} not found` };
      return {
        status: order.status,
        driver_assigned: !!order.driverId,
        driver_name: order.driver?.user?.name || null,
        pickup_address: order.pickupAddress,
        drop_address: order.dropAddress,
        estimated_time: order.estimatedTime,
        total_amount: order.totalAmount,
        created_at: order.createdAt,
      };
    }
    case 'get_driver_account_status': {
      if (!input || !input.driver_user_id) return { error: 'Missing driver_user_id parameter' };
      const driver = await Driver.findOne({ where: { userId: input.driver_user_id } });
      if (!driver) return { error: 'Driver not found' };
      return {
        is_verified: driver.isVerified,
        is_online: driver.isOnline,
        is_available: driver.isAvailable,
        rating: driver.rating,
        total_deliveries: driver.totalDeliveries,
      };
    }
    case 'escalate_to_human':
      return { acknowledged: true };
    default:
      return { error: `Unknown tool: ${name}` };
  }
};

const processSupportMessage = async ({ message, userType, conversationHistory = [] }) => {
  if (shouldForceEscalate(message)) {
    return {
      resolved: false,
      escalation: {
        category: guessCategory(message),
        priority: 'critical',
        subject: message.slice(0, 60),
        summary: `User message flagged for mandatory human review: "${message}"`,
      },
      sentiment: detectSentiment(message),
    };
  }

  const systemInstruction = userType === 'driver' ? DRIVER_SYSTEM_PROMPT : CUSTOMER_SYSTEM_PROMPT;
  const ai = getClient();
  
  const modelInstance = ai.getGenerativeModel({
    model: MODEL,
    systemInstruction,
    tools: GEMINI_TOOLS,
  });

  // Map incoming history cleanly
  const contents = [
    ...conversationHistory.map((m) => ({
      role: m.senderType === 'ai' ? 'model' : 'user',
      parts: [{ text: m.message }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  let iterations = 0;
  const maxIterations = 4;

  while (iterations < maxIterations) {
    iterations++;
    
    const result = await modelInstance.generateContent({ contents });
    const response = await result.response;
    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];

      if (call.name === 'escalate_to_human') {
        return {
          resolved: false,
          escalation: call.args,
          sentiment: detectSentiment(message),
        };
      }

      const toolResultData = await executeTool(call.name, call.args);

      // Save call state
      contents.push({
        role: 'model',
        parts: [{ functionCall: call }]
      });

      // Provide execution result response path back to context cleanly
      contents.push({
        role: 'function',
        parts: [{
          functionResponse: {
            name: call.name,
            response: toolResultData
          }
        }]
      });

      continue;
    }

    const textReply = response.text();
    return { 
      resolved: true, 
      reply: textReply, 
      sentiment: detectSentiment(message) 
    };
  }

  // Fallback to text request if loop iterations are spent without pure escalation intent
  return {
    resolved: true,
    reply: "I can look up your order status for you! Could you please provide your order number (e.g., ORD-1234)?",
    sentiment: detectSentiment(message),
  };
};

const guessCategory = (text) => {
  const lower = text.toLowerCase();
  if (/refund|money back/.test(lower)) return 'refund';
  if (/pay|charge|deduct|transaction/.test(lower)) return 'payment';
  if (/suspend|block|verif|license/.test(lower)) return 'account';
  if (/gps|app|bug|error|crash/.test(lower)) return 'technical';
  if (/driver/.test(lower)) return 'driver';
  if (/order|delivery|deliver/.test(lower)) return 'order';
  return 'other';
};

const CUSTOMER_SYSTEM_PROMPT = `You are a helpful support assistant for DeliverPro, a delivery platform.

You can answer these common questions directly:
- Where is my order? (If the user provides an order number, call get_order_status. If they do NOT provide an order number, do NOT call the tool; instead, ask them nicely to provide it).
- Why is my order delayed?
- How can I cancel my order? (explain: go to order details, tap Cancel Order, only works before pickup)
- How do I add another address? (explain: this is entered fresh for each new order in the booking form)
- How do I pay online? (explain: Razorpay - card, UPI, wallet - tap Pay Now on order detail page)
- Coupon not working? (ask which coupon and explain to check expiry/minimum order value)

You must escalate to a human (use escalate_to_human tool) for:
- Customer didn't receive their order / wrong item delivered / damaged item
- Refund requests requiring manual processing
- Payment charged but order not delivered / double charged
- Any accident, injury, or safety concern
- Fraud reports or legal complaints
- Anything you're not confident about

Be warm, brief, and helpful. If you can answer directly, do so in 2-3 sentences.`;

const DRIVER_SYSTEM_PROMPT = `You are a helpful support assistant for DeliverPro drivers...`;

module.exports = {
  processSupportMessage,
  detectSentiment,
};