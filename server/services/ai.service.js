// /**
//  * ai.service.js — Anthropic Claude AI Service
//  * Tool-use pattern: Claude calls your existing service functions,
//  * never touches the database directly.
//  */

// const Anthropic = require('@anthropic-ai/sdk');
// const { Order, Driver, Payment } = require('../models');
// const { Op } = require('sequelize');
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

// // ── Tools Claude can call ─────────────────────────────────
// const ALL_TOOLS = [
//   {
//     name: 'calculate_price',
//     description: 'Calculate delivery price based on distance and weight',
//     input_schema: {
//       type: 'object',
//       properties: {
//         distance_km:  { type: 'number' },
//         weight_kg:    { type: 'number' },
//         vehicle_type: { type: 'string', enum: ['bike', 'scooter', 'car', 'van', 'truck'] },
//       },
//       required: ['distance_km', 'weight_kg'],
//     },
//   },
//   {
//     name: 'recommend_vehicle',
//     description: 'Recommend best vehicle type for an item',
//     input_schema: {
//       type: 'object',
//       properties: {
//         item_description: { type: 'string' },
//         weight_kg:        { type: 'number' },
//         is_fragile:       { type: 'boolean' },
//       },
//       required: ['item_description'],
//     },
//   },
//   {
//     name: 'get_order_stats',
//     description: 'Get business statistics for admin',
//     input_schema: {
//       type: 'object',
//       properties: {
//         days:   { type: 'number' },
//         metric: { type: 'string', enum: ['revenue', 'orders', 'drivers', 'delays'] },
//       },
//       required: ['days', 'metric'],
//     },
//   },
//   {
//     name: 'check_driver_fraud',
//     description: 'Analyze driver for suspicious cancellation patterns',
//     input_schema: {
//       type: 'object',
//       properties: {
//         driver_id: { type: 'string' },
//         days:      { type: 'number' },
//       },
//       required: ['driver_id'],
//     },
//   },
// ];

// // ── Tool executors — real DB reads via your existing models ──
// const executeTool = async (name, input) => {
//   logger.info(`[AI Tool] ${name}:`, input);
//   switch (name) {

//     case 'calculate_price': {
//       const { distance_km, weight_kg, vehicle_type = 'bike' } = input;
//       const BASE = { bike: 20, scooter: 25, car: 35, van: 50, truck: 80 };
//       const base = BASE[vehicle_type] || 20;
//       const distFee = parseFloat((distance_km * 8).toFixed(2));
//       const wtFee   = parseFloat((weight_kg * 5).toFixed(2));
//       const total   = parseFloat((base + distFee + wtFee).toFixed(2));
//       return {
//         base_fare: base, distance_fee: distFee, weight_fee: wtFee, total, currency: 'INR',
//         breakdown: `Base ₹${base} + Distance ₹${distFee} (${distance_km}km×₹8) + Weight ₹${wtFee} (${weight_kg}kg×₹5)`,
//       };
//     }

//     case 'recommend_vehicle': {
//       const { item_description, weight_kg = 0, is_fragile = false } = input;
//       const lower = item_description.toLowerCase();
//       let vehicle = 'bike', reason = '';
//       if (weight_kg > 500 || /sofa|furniture|fridge|washing machine/.test(lower)) {
//         vehicle = 'truck'; reason = 'Heavy/large item needs a truck for safe transport';
//       } else if (weight_kg > 100 || /tv|television|\bac\b|appliance/.test(lower)) {
//         vehicle = 'van'; reason = 'Medium-heavy appliance needs van loading space';
//       } else if (weight_kg > 30 || /cartons|boxes|luggage|multiple/.test(lower)) {
//         vehicle = 'car'; reason = 'Multiple items or moderate weight fits in a car';
//       } else if (is_fragile || /fragile|glass|laptop|electronics|phone/.test(lower)) {
//         vehicle = 'scooter'; reason = 'Fragile/electronic items are safer with scooter handling';
//       } else {
//         vehicle = 'bike'; reason = 'Small light items — bike is fastest and cheapest';
//       }
//       const BASE = { bike: 20, scooter: 25, car: 35, van: 50, truck: 80 };
//       return { recommended_vehicle: vehicle, reason, base_fare: BASE[vehicle], fragile: is_fragile };
//     }

//     case 'get_order_stats': {
//       const { days = 7, metric } = input;
//       const since = new Date(Date.now() - days * 86400000);

//       if (metric === 'revenue') {
//         const [total, count] = await Promise.all([
//           Payment.sum('amount', { where: { status: 'success', paidAt: { [Op.gte]: since } } }),
//           Order.count({ where: { createdAt: { [Op.gte]: since } } }),
//         ]);
//         return {
//           total_revenue: total || 0, total_orders: count, period_days: days,
//           avg_per_order: count ? ((total || 0) / count).toFixed(2) : 0,
//         };
//       }
//       if (metric === 'orders') {
//         const [total, delivered, cancelled, active] = await Promise.all([
//           Order.count({ where: { createdAt: { [Op.gte]: since } } }),
//           Order.count({ where: { status: 'delivered', createdAt: { [Op.gte]: since } } }),
//           Order.count({ where: { status: 'cancelled', createdAt: { [Op.gte]: since } } }),
//           Order.count({ where: { status: { [Op.in]: ['pending', 'accepted', 'picked_up', 'in_transit'] } } }),
//         ]);
//         return {
//           total, delivered, cancelled, active, period_days: days,
//           delivery_rate: total ? `${((delivered / total) * 100).toFixed(1)}%` : '0%',
//         };
//       }
//       if (metric === 'drivers') {
//         const [total, online, verified] = await Promise.all([
//           Driver.count(),
//           Driver.count({ where: { isOnline: true } }),
//           Driver.count({ where: { isVerified: true } }),
//         ]);
//         return { total_drivers: total, online, verified, unverified: total - verified };
//       }
//       if (metric === 'delays') {
//         const delayed = await Order.count({
//           where: {
//             status: { [Op.in]: ['pending', 'accepted'] },
//             createdAt: { [Op.lt]: new Date(Date.now() - 3600000) },
//           },
//         });
//         return { delayed_orders: delayed, threshold: '1 hour', period_days: days };
//       }
//       return { error: 'Unknown metric' };
//     }

//     case 'check_driver_fraud': {
//       const { driver_id, days = 14 } = input;
//       const since  = new Date(Date.now() - days * 86400000);
//       const driver = await Driver.findOne({ where: { userId: driver_id } });
//       if (!driver) return { error: 'Driver not found' };

//       const [delivered, cancelled, total] = await Promise.all([
//         Order.count({ where: { driverId: driver.id, status: 'delivered', createdAt: { [Op.gte]: since } } }),
//         Order.count({ where: { driverId: driver.id, status: 'cancelled', createdAt: { [Op.gte]: since } } }),
//         Order.count({ where: { driverId: driver.id, createdAt: { [Op.gte]: since } } }),
//       ]);

//       const rate = total > 0 ? (cancelled / total) * 100 : 0;
//       const risk = rate > 30 || cancelled > 5 ? 'HIGH' : rate > 15 ? 'MEDIUM' : 'LOW';

//       return {
//         driver_id, period_days: days, total, delivered, cancelled,
//         cancellation_rate: `${rate.toFixed(1)}%`,
//         fraud_risk: risk,
//         driver_rating: driver.rating,
//         total_deliveries: driver.totalDeliveries,
//         recommendation: risk === 'HIGH' ? 'Suspend and review immediately' : 'No action needed',
//       };
//     }

//     default:
//       return { error: `Unknown tool: ${name}` };
//   }
// };

// // ── Core agentic loop — Claude calls tools until done ─────
// const runAgent = async (system, userMessage, tools = [], maxIterations = 5) => {
//   const messages = [{ role: 'user', content: userMessage }];
//   let iteration = 0;

//   while (iteration < maxIterations) {
//     iteration++;
//     const resp = await getClient().messages.create({
//       model: MODEL,
//       max_tokens: 1024,
//       system,
//       tools,
//       messages,
//     });

//     if (resp.stop_reason === 'end_turn') {
//       const text = resp.content.find((b) => b.type === 'text')?.text || '';
//       return { success: true, response: text, iterations: iteration };
//     }

//     if (resp.stop_reason === 'tool_use') {
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
//     break;
//   }
//   return { success: false, response: 'Could not complete request', iterations: iteration };
// };

// // ═══════════════════════════════════════════════════════
// // PUBLIC SERVICE METHODS
// // ═══════════════════════════════════════════════════════

// // 1. AI Booking Assistant — natural language → structured order data
// const bookingAssistant = async (userMessage) => {
//   const system = `You are a smart booking assistant for DeliverPro, an Indian delivery platform.
// Extract delivery details and respond ONLY with this exact JSON (no other text, no markdown fences):
// {
//   "pickup": "address or null",
//   "drop": "address or null",
//   "item": "item description",
//   "weight_kg": number or null,
//   "is_fragile": boolean,
//   "vehicle": "bike|scooter|car|van|truck",
//   "special_notes": "instructions or null",
//   "confidence": "high|medium|low",
//   "questions": ["missing info questions, empty array if none"]
// }
// Rules: estimate weight if not given (washing machine=70, laptop=2, phone=0.3, sofa=100, fridge=80), always determine best vehicle.`;

//   const result = await runAgent(system, userMessage, [ALL_TOOLS[0], ALL_TOOLS[1]]);
//   if (!result.success) throw new Error(result.response);
//   try {
//     const cleaned = result.response.replace(/```json\n?|\n?```/g, '').trim();
//     return JSON.parse(cleaned);
//   } catch {
//     return { raw: result.response, parse_error: true };
//   }
// };

// // 2. AI Price Explainer
// const explainPrice = async ({ totalAmount, basePrice, deliveryFee, distance, weight, vehicleType }) => {
//   const system = `You are a friendly customer support agent for DeliverPro.
// Explain the delivery charge in 2-3 simple, friendly sentences. Use ₹ symbol. End with reassurance.`;
//   return runAgent(
//     system,
//     `Explain: Total ₹${totalAmount} = Base ₹${basePrice} + Fee ₹${deliveryFee} | ${distance}km | ${weight}kg | ${vehicleType}`,
//     []
//   );
// };

// // 3. AI Packaging Advisor
// const packagingAdvice = async (itemDescription) => {
//   const system = `You are a packaging expert for a delivery service.
// Give 4-5 practical packing tips as a bulleted list for the item described. Be concise and specific.`;
//   return runAgent(system, `Packing tips for: ${itemDescription}`, []);
// };

// // 4. AI Driver Smart Reply
// const generateSmartReply = async ({ customerMessage, orderStatus }) => {
//   const system = `You are helping a delivery driver reply to a customer message.
// Write a short (2-3 sentence), polite, professional reply. Sound human and reassuring.
// Current order status: ${orderStatus || 'in progress'}`;
//   return runAgent(system, `Customer: "${customerMessage}" → Generate driver reply:`, []);
// };

// // 5. AI Delivery Notes Summarizer
// const summarizeDeliveryNotes = async (notes) => {
//   const system = `Summarize customer delivery instructions for a driver as a numbered action list. Max 4 items. Be brief and clear.`;
//   return runAgent(system, `Instructions: "${notes}"`, []);
// };

// // 6. AI Admin Operations Query
// const adminQuery = async (question) => {
//   const system = `You are an AI business analyst for DeliverPro.
// Use the tools to get real data and answer the admin's question.
// Be concise, highlight key numbers, and give 1 actionable recommendation at the end.`;
//   return runAgent(system, question, [ALL_TOOLS[2], ALL_TOOLS[3]]);
// };

// // 7. AI Fraud Detection
// const detectFraud = async (driverId) => {
//   const system = `You are a fraud analyst for a delivery platform.
// Analyze the driver behavior data and give: Risk Level, Key Findings (2-3 bullets), Recommendation.`;
//   return runAgent(system, `Analyze driver ${driverId} for suspicious patterns over 14 days`, [ALL_TOOLS[3]]);
// };

// module.exports = {
//   bookingAssistant,
//   explainPrice,
//   packagingAdvice,
//   generateSmartReply,
//   summarizeDeliveryNotes,
//   adminQuery,
//   detectFraud,
// };


/**
 * ai.service.js — Gemini AI Service
 * Tool-use pattern: Gemini calls your existing service functions,
 * never touches the database directly.
 */

// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const { Order, Driver, Payment } = require('../models');
// const { Op } = require('sequelize');
// const logger = require('../utils/logger');

// console.log(process.env.GEMINI_API_KEY)

// let _genAI = null;
// const getGeminiClient = () => {
//   if (!_genAI) {
//     if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
//     _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
//   }
//   return _genAI;
// };

// const MODEL_NAME = 'gemini-2.5-flash';

// // ── Tools Schema Map (Converted to Gemini/OpenAPI format) ─────
// const ALL_TOOLS = [
//   {
//     name: 'calculate_price',
//     description: 'Calculate delivery price based on distance and weight',
//     parameters: {
//       type: 'OBJECT',
//       properties: {
//         distance_km:  { type: 'NUMBER' },
//         weight_kg:    { type: 'NUMBER' },
//         vehicle_type: { type: 'STRING', enum: ['bike', 'scooter', 'car', 'van', 'truck'] },
//       },
//       required: ['distance_km', 'weight_kg'],
//     },
//   },
//   {
//     name: 'recommend_vehicle',
//     description: 'Recommend best vehicle type for an item',
//     parameters: {
//       type: 'OBJECT',
//       properties: {
//         item_description: { type: 'STRING' },
//         weight_kg:        { type: 'NUMBER' },
//         is_fragile:       { type: 'BOOLEAN' },
//       },
//       required: ['item_description'],
//     },
//   },
//   {
//     name: 'get_order_stats',
//     description: 'Get business statistics for admin',
//     parameters: {
//       type: 'OBJECT',
//       properties: {
//         days:   { type: 'NUMBER' },
//         metric: { type: 'STRING', enum: ['revenue', 'orders', 'drivers', 'delays'] },
//       },
//       required: ['days', 'metric'],
//     },
//   },
//   {
//     name: 'check_driver_fraud',
//     description: 'Analyze driver for suspicious cancellation patterns',
//     parameters: {
//       type: 'OBJECT',
//       properties: {
//         driver_id: { type: 'STRING' },
//         days:      { type: 'NUMBER' },
//       },
//       required: ['driver_id'],
//     },
//   },
// ];

// // ── Tool executors — (Kept exactly identical to your original code) ──
// const executeTool = async (name, input) => {
//   logger.info(`[AI Tool] ${name}:`, input);
//   switch (name) {

//     case 'calculate_price': {
//       const { distance_km, weight_kg, vehicle_type = 'bike' } = input;
//       const BASE = { bike: 20, scooter: 25, car: 35, van: 50, truck: 80 };
//       const base = BASE[vehicle_type] || 20;
//       const distFee = parseFloat((distance_km * 8).toFixed(2));
//       const wtFee   = parseFloat((weight_kg * 5).toFixed(2));
//       const total   = parseFloat((base + distFee + wtFee).toFixed(2));
//       return {
//         base_fare: base, distance_fee: distFee, weight_fee: wtFee, total, currency: 'INR',
//         breakdown: `Base ₹${base} + Distance ₹${distFee} (${distance_km}km×₹8) + Weight ₹${wtFee} (${weight_kg}kg×₹5)`,
//       };
//     }

//     case 'recommend_vehicle': {
//       const { item_description, weight_kg = 0, is_fragile = false } = input;
//       const lower = item_description.toLowerCase();
//       let vehicle = 'bike', reason = '';
//       if (weight_kg > 500 || /sofa|furniture|fridge|washing machine/.test(lower)) {
//         vehicle = 'truck'; reason = 'Heavy/large item needs a truck for safe transport';
//       } else if (weight_kg > 100 || /tv|television|\bac\b|appliance/.test(lower)) {
//         vehicle = 'van'; reason = 'Medium-heavy appliance needs van loading space';
//       } else if (weight_kg > 30 || /cartons|boxes|luggage|multiple/.test(lower)) {
//         vehicle = 'car'; reason = 'Multiple items or moderate weight fits in a car';
//       } else if (is_fragile || /fragile|glass|laptop|electronics|phone/.test(lower)) {
//         vehicle = 'scooter'; reason = 'Fragile/electronic items are safer with scooter handling';
//       } else {
//         vehicle = 'bike'; reason = 'Small light items — bike is fastest and cheapest';
//       }
//       const BASE = { bike: 20, scooter: 25, car: 35, van: 50, truck: 80 };
//       return { recommended_vehicle: vehicle, reason, base_fare: BASE[vehicle], fragile: is_fragile };
//     }

//     case 'get_order_stats': {
//       const { days = 7, metric } = input;
//       const since = new Date(Date.now() - days * 86400000);

//       if (metric === 'revenue') {
//         const [total, count] = await Promise.all([
//           Payment.sum('amount', { where: { status: 'success', paidAt: { [Op.gte]: since } } }),
//           Order.count({ where: { createdAt: { [Op.gte]: since } } }),
//         ]);
//         return {
//           total_revenue: total || 0, total_orders: count, period_days: days,
//           avg_per_order: count ? ((total || 0) / count).toFixed(2) : 0,
//         };
//       }
//       if (metric === 'orders') {
//         const [total, delivered, cancelled, active] = await Promise.all([
//           Order.count({ where: { createdAt: { [Op.gte]: since } } }),
//           Order.count({ where: { status: 'delivered', createdAt: { [Op.gte]: since } } }),
//           Order.count({ where: { status: 'cancelled', createdAt: { [Op.gte]: since } } }),
//           Order.count({ where: { status: { [Op.in]: ['pending', 'accepted', 'picked_up', 'in_transit'] } } }),
//         ]);
//         return {
//           total, delivered, cancelled, active, period_days: days,
//           delivery_rate: total ? `${((delivered / total) * 100).toFixed(1)}%` : '0%',
//         };
//       }
//       if (metric === 'drivers') {
//         const [total, online, verified] = await Promise.all([
//           Driver.count(),
//           Driver.count({ where: { isOnline: true } }),
//           Driver.count({ where: { isVerified: true } }),
//         ]);
//         return { total_drivers: total, online, verified, unverified: total - verified };
//       }
//       if (metric === 'delays') {
//         const delayed = await Order.count({
//           where: {
//             status: { [Op.in]: ['pending', 'accepted'] },
//             createdAt: { [Op.lt]: new Date(Date.now() - 3600000) },
//           },
//         });
//         return { delayed_orders: delayed, threshold: '1 hour', period_days: days };
//       }
//       return { error: 'Unknown metric' };
//     }

//     case 'check_driver_fraud': {
//       const { driver_id, days = 14 } = input;
//       const since  = new Date(Date.now() - days * 86400000);
//       const driver = await Driver.findOne({ where: { userId: driver_id } });
//       if (!driver) return { error: 'Driver not found' };

//       const [delivered, cancelled, total] = await Promise.all([
//         Order.count({ where: { driverId: driver.id, status: 'delivered', createdAt: { [Op.gte]: since } } }),
//         Order.count({ where: { driverId: driver.id, status: 'cancelled', createdAt: { [Op.gte]: since } } }),
//         Order.count({ where: { driverId: driver.id, createdAt: { [Op.gte]: since } } }),
//       ]);

//       const rate = total > 0 ? (cancelled / total) * 100 : 0;
//       const risk = rate > 30 || cancelled > 5 ? 'HIGH' : rate > 15 ? 'MEDIUM' : 'LOW';

//       return {
//         driver_id, period_days: days, total, delivered, cancelled,
//         cancellation_rate: `${rate.toFixed(1)}%`,
//         fraud_risk: risk,
//         driver_rating: driver.rating,
//         total_deliveries: driver.totalDeliveries,
//         recommendation: risk === 'HIGH' ? 'Suspend and review immediately' : 'No action needed',
//       };
//     }

//     default:
//       return { error: `Unknown tool: ${name}` };
//   }
// };

// // ── Core agentic loop adapted for Gemini ──────────────────
// const runAgent = async (system, userMessage, tools = [], maxIterations = 5) => {
//   const ai = getGeminiClient();
  
//   // Format the tools config array if tools are supplied
//   const geminiTools = tools.length > 0 ? [{ functionDeclarations: tools }] : [];

//   const model = ai.getGenerativeModel({
//     model: MODEL_NAME,
//     systemInstruction: system,
//     tools: geminiTools,
//   });

//   // Gemini chat conversation state
//   const contents = [{ role: 'user', parts: [{ text: userMessage }] }];
//   let iteration = 0;

//   while (iteration < maxIterations) {
//     iteration++;
//     const result = await model.generateContent({ contents });
//     const response = result.response;
//     const functionCalls = response.functionCalls;

//     // Turn complete: Gemini returned a direct text response without calling tools
//     if (!functionCalls || functionCalls.length === 0) {
//       return { success: true, response: response.text(), iterations: iteration };
//     }

//     // Agent turn continue: Gemini wants to invoke one or multiple functions
//     // 1. Keep Gemini's choices in the conversation logs
//     contents.push(response.candidates[0].content);

//     // 2. Loop through and process all parallel tool executions requested by Gemini
//     const functionResponseParts = [];
//     for (const call of functionCalls) {
//       const toolResult = await executeTool(call.name, call.args);
//       functionResponseParts.push({
//         functionResponse: {
//           name: call.name,
//           response: { content: toolResult }
//         }
//       });
//     }

//     // 3. Append the execution results back using the 'function' role context
//     contents.push({
//       role: 'function',
//       parts: functionResponseParts
//     });

//     // Continue loop execution to give results back to Gemini
//   }

//   return { success: false, response: 'Could not complete request', iterations: iteration };
// };

// // ═══════════════════════════════════════════════════════
// // PUBLIC SERVICE METHODS (Unchanged syntax, uses new runAgent)
// // ═══════════════════════════════════════════════════════

// const bookingAssistant = async (userMessage) => {
//   const system = `You are a smart booking assistant for DeliverPro, an Indian delivery platform.
// Extract delivery details and respond ONLY with this exact JSON (no other text, no markdown fences):
// {
//   "pickup": "address or null",
//   "drop": "address or null",
//   "item": "item description",
//   "weight_kg": number or null,
//   "is_fragile": boolean,
//   "vehicle": "bike|scooter|car|van|truck",
//   "special_notes": "instructions or null",
//   "confidence": "high|medium|low",
//   "questions": ["missing info questions, empty array if none"]
// }
// Rules: estimate weight if not given (washing machine=70, laptop=2, phone=0.3, sofa=100, fridge=80), always determine best vehicle.`;

//   const result = await runAgent(system, userMessage, [ALL_TOOLS[0], ALL_TOOLS[1]]);
//   if (!result.success) throw new Error(result.response);
//   try {
//     const cleaned = result.response.replace(/```json\n?|\n?```/g, '').trim();
//     return JSON.parse(cleaned);
//   } catch {
//     return { raw: result.response, parse_error: true };
//   }
// };

// const explainPrice = async ({ totalAmount, basePrice, deliveryFee, distance, weight, vehicleType }) => {
//   const system = `You are a friendly customer support agent for DeliverPro.
// Explain the delivery charge in 2-3 simple, friendly sentences. Use ₹ symbol. End with reassurance.`;
//   return runAgent(
//     system,
//     `Explain: Total ₹${totalAmount} = Base ₹${basePrice} + Fee ₹${deliveryFee} | ${distance}km | ${weight}kg | ${vehicleType}`,
//     []
//   );
// };

// const packagingAdvice = async (itemDescription) => {
//   const system = `You are a packaging expert for a delivery service.
// Give 4-5 practical packing tips as a bulleted list for the item described. Be concise and specific.`;
//   return runAgent(system, `Packing tips for: ${itemDescription}`, []);
// };

// const generateSmartReply = async ({ customerMessage, orderStatus }) => {
//   const system = `You are helping a delivery driver reply to a customer message.
// Write a short (2-3 sentence), polite, professional reply. Sound human and reassuring.
// Current order status: ${orderStatus || 'in progress'}`;
//   return runAgent(system, `Customer: "${customerMessage}" → Generate driver reply:`, []);
// };

// const summarizeDeliveryNotes = async (notes) => {
//   const system = `Summarize customer delivery instructions for a driver as a numbered action list. Max 4 items. Be brief and clear.`;
//   return runAgent(system, `Instructions: "${notes}"`, []);
// };

// const adminQuery = async (question) => {
//   const system = `You are an AI business analyst for DeliverPro.
// Use the tools to get real data and answer the admin's question.
// Be concise, highlight key numbers, and give 1 actionable recommendation at the end.`;
//   return runAgent(system, question, [ALL_TOOLS[2], ALL_TOOLS[3]]);
// };

// const detectFraud = async (driverId) => {
//   const system = `You are a fraud analyst for a delivery platform.
// Analyze the driver behavior data and give: Risk Level, Key Findings (2-3 bullets), Recommendation.`;
//   return runAgent(system, `Analyze driver ${driverId} for suspicious patterns over 14 days`, [ALL_TOOLS[3]]);
// };

// module.exports = {
//   bookingAssistant,
//   explainPrice,
//   packagingAdvice,
//   generateSmartReply,
//   summarizeDeliveryNotes,
//   adminQuery,
//   detectFraud,
// };


const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Order, Driver, Payment } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

console.log(process.env.GEMINI_API_KEY)

let _genAI = null;
const getGeminiClient = () => {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
};

// const MODEL_NAME = 'gemini-2.5-flash';
const MODEL_NAME = 'gemini-2.5-flash';

// ── Tools Schema Map (Converted to Gemini/OpenAPI format) ─────
const ALL_TOOLS = [
  {
    name: 'calculate_price',
    description: 'Calculate delivery price based on distance and weight',
    parameters: {
      type: 'OBJECT',
      properties: {
        distance_km:  { type: 'NUMBER' },
        weight_kg:    { type: 'NUMBER' },
        vehicle_type: { type: 'STRING', enum: ['bike', 'scooter', 'car', 'van', 'truck'] },
      },
      required: ['distance_km', 'weight_kg'],
    },
  },
  {
    name: 'recommend_vehicle',
    description: 'Recommend best vehicle type for an item',
    parameters: {
      type: 'OBJECT',
      properties: {
        item_description: { type: 'STRING' },
        weight_kg:        { type: 'NUMBER' },
        is_fragile:       { type: 'BOOLEAN' },
      },
      required: ['item_description'],
    },
  },
  {
    name: 'get_order_stats',
    description: 'Get business statistics for admin including revenue and statuses',
    parameters: {
      type: 'OBJECT',
      properties: {
        days:   { type: 'NUMBER' },
        metric: { type: 'STRING', enum: ['revenue', 'orders', 'drivers', 'delays'] },
      },
      required: ['days', 'metric'],
    },
  },
  {
    name: 'check_driver_fraud',
    description: 'Analyze driver for suspicious cancellation patterns',
    parameters: {
      type: 'OBJECT',
      properties: {
        driver_id: { type: 'STRING' },
        days:      { type: 'NUMBER' },
      },
      required: ['driver_id'],
    },
  },
];

// ── Tool executors ──
const executeTool = async (name, input) => {
  logger.info(`[AI Tool] ${name}:`, input);
  switch (name) {

    case 'calculate_price': {
      const { distance_km, weight_kg, vehicle_type = 'bike' } = input;
      const BASE = { bike: 20, scooter: 25, car: 35, van: 50, truck: 80 };
      const base = BASE[vehicle_type] || 20;
      const distFee = parseFloat((distance_km * 8).toFixed(2));
      const wtFee   = parseFloat((weight_kg * 5).toFixed(2));
      const total   = parseFloat((base + distFee + wtFee).toFixed(2));
      return {
        base_fare: base, distance_fee: distFee, weight_fee: wtFee, total, currency: 'INR',
        breakdown: `Base ₹${base} + Distance ₹${distFee} (${distance_km}km×₹8) + Weight ₹${wtFee} (${weight_kg}kg×₹5)`,
      };
    }

    case 'recommend_vehicle': {
      const { item_description, weight_kg = 0, is_fragile = false } = input;
      const lower = item_description.toLowerCase();
      let vehicle = 'bike', reason = '';
      if (weight_kg > 500 || /sofa|furniture|fridge|washing machine/.test(lower)) {
        vehicle = 'truck'; reason = 'Heavy/large item needs a truck for safe transport';
      } else if (weight_kg > 100 || /tv|television|\bac\b|appliance/.test(lower)) {
        vehicle = 'van'; reason = 'Medium-heavy appliance needs van loading space';
      } else if (weight_kg > 30 || /cartons|boxes|luggage|multiple/.test(lower)) {
        vehicle = 'car'; reason = 'Multiple items or moderate weight fits in a car';
      } else if (is_fragile || /fragile|glass|laptop|electronics|phone/.test(lower)) {
        vehicle = 'scooter'; reason = 'Fragile/electronic items are safer with scooter handling';
      } else {
        vehicle = 'bike'; reason = 'Small light items — bike is fastest and cheapest';
      }
      const BASE = { bike: 20, scooter: 25, car: 35, van: 50, truck: 80 };
      return { recommended_vehicle: vehicle, reason, base_fare: BASE[vehicle], fragile: is_fragile };
    }

    case 'get_order_stats': {
      const { days = 7, metric } = input;
      const since = new Date(Date.now() - days * 86400000);

      if (metric === 'revenue') {
        // Fix: Fetch both online revenue and cash-collected revenue from orders
        const [onlineRevenue, cashRevenue, count] = await Promise.all([
          Payment.sum('amount', { 
            where: { status: 'success', paidAt: { [Op.gte]: since } } 
          }),
          Order.sum('totalAmount', { 
            where: { cashCollected: true, cashCollectedAt: { [Op.gte]: since } } 
          }),
          Order.count({ 
            where: { status: 'delivered', deliveredAt: { [Op.gte]: since } } 
          }),
        ]);

        const total = (onlineRevenue || 0) + (cashRevenue || 0);

        return {
          total_revenue: total || 0,
          online_revenue: onlineRevenue || 0,
          cash_revenue: cashRevenue || 0,
          total_completed_orders: count,
          period_days: days,
          avg_per_order: count ? (total / count).toFixed(2) : 0,
        };
      }
      
      if (metric === 'orders') {
        const [total, delivered, cancelled, active, passengerCount, deliveryCount] = await Promise.all([
          Order.count({ where: { createdAt: { [Op.gte]: since } } }),
          Order.count({ where: { status: 'delivered', createdAt: { [Op.gte]: since } } }),
          Order.count({ where: { status: 'cancelled', createdAt: { [Op.gte]: since } } }),
          Order.count({ where: { status: { [Op.in]: ['pending', 'accepted', 'picked_up', 'in_transit'] } } }),
          Order.count({ where: { orderType: 'passenger', createdAt: { [Op.gte]: since } } }),
          Order.count({ where: { orderType: 'delivery', createdAt: { [Op.gte]: since } } }),
        ]);
        return {
          total, 
          delivered, 
          cancelled, 
          active, 
          passenger_rides: passengerCount,
          goods_deliveries: deliveryCount,
          period_days: days,
          delivery_rate: total ? `${((delivered / total) * 100).toFixed(1)}%` : '0%',
        };
      }
      if (metric === 'drivers') {
        const [total, online, verified] = await Promise.all([
          Driver.count(),
          Driver.count({ where: { isOnline: true } }),
          Driver.count({ where: { isVerified: true } }),
        ]);
        return { total_drivers: total, online, verified, unverified: total - verified };
      }
      if (metric === 'delays') {
        const delayed = await Order.count({
          where: {
            status: { [Op.in]: ['pending', 'accepted'] },
            createdAt: { [Op.lt]: new Date(Date.now() - 3600000) },
          },
        });
        return { delayed_orders: delayed, threshold: '1 hour', period_days: days };
      }
      return { error: 'Unknown metric' };
    }

    case 'check_driver_fraud': {
      const { driver_id, days = 14 } = input;
      const since  = new Date(Date.now() - days * 86400000);
      const driver = await Driver.findOne({ where: { userId: driver_id } });
      if (!driver) return { error: 'Driver not found' };

      const [delivered, cancelled, total] = await Promise.all([
        Order.count({ where: { driverId: driver.id, status: 'delivered', createdAt: { [Op.gte]: since } } }),
        Order.count({ where: { driverId: driver.id, status: 'cancelled', createdAt: { [Op.gte]: since } } }),
        Order.count({ where: { driverId: driver.id, createdAt: { [Op.gte]: since } } }),
      ]);

      const rate = total > 0 ? (cancelled / total) * 100 : 0;
      const risk = rate > 30 || cancelled > 5 ? 'HIGH' : rate > 15 ? 'MEDIUM' : 'LOW';

      return {
        driver_id, period_days: days, total, delivered, cancelled,
        cancellation_rate: `${rate.toFixed(1)}%`,
        fraud_risk: risk,
        driver_rating: driver.rating,
        total_deliveries: driver.totalDeliveries,
        recommendation: risk === 'HIGH' ? 'Suspend and review immediately' : 'No action needed',
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
};

// // ── Core agentic loop adapted for Gemini ──────────────────

const runAgent = async (system, userMessage, tools = [], maxIterations = 5) => {
  const ai = getGeminiClient();
  const geminiTools = tools.length > 0 ? [{ functionDeclarations: tools }] : [];
  const model = ai.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: system,
    tools: geminiTools,
  });

  const contents = [{ role: 'user', parts: [{ text: userMessage }] }];
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;
    const result = await model.generateContent({ contents });
    const response = result.response;
    
    // Added parentheses () to actually execute the SDK method
    const functionCalls = response.functionCalls(); 

    if (!functionCalls || functionCalls.length === 0) {
      return { success: true, response: response.text(), iterations: iteration };
    }

    // Save model's tool request turn to the conversational history
    contents.push(response.candidates[0].content);

    const functionResponseParts = [];
    for (const call of functionCalls) {
      const toolResult = await executeTool(call.name, call.args);
      functionResponseParts.push({
        functionResponse: {
          name: call.name,
          response: { content: toolResult }
        }
      });
    }

    // Append function execution logs to back-and-forth context
    contents.push({
      role: 'function',
      parts: functionResponseParts
    });
  }

  return { success: false, response: 'Could not complete request', iterations: iteration };
};

// ═══════════════════════════════════════════════════════
// PUBLIC SERVICE METHODS
// ═══════════════════════════════════════════════════════

const bookingAssistant = async (userMessage) => {
  const system = `You are a smart booking assistant for DeliverPro, an Indian delivery platform.
Extract delivery details and respond ONLY with this exact JSON (no other text, no markdown fences):
{
  "pickup": "address or null",
  "drop": "address or null",
  "item": "item description",
  "weight_kg": number or null,
  "is_fragile": boolean,
  "vehicle": "bike|scooter|car|van|truck",
  "special_notes": "instructions or null",
  "confidence": "high|medium|low",
  "questions": ["missing info questions, empty array if none"]
}
Rules: estimate weight if not given (washing machine=70, laptop=2, phone=0.3, sofa=100, fridge=80), always determine best vehicle.`;

  const result = await runAgent(system, userMessage, [ALL_TOOLS[0], ALL_TOOLS[1]]);
  if (!result.success) throw new Error(result.response);
  try {
    const cleaned = result.response.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { raw: result.response, parse_error: true };
  }
};

const explainPrice = async ({ totalAmount, basePrice, deliveryFee, distance, weight, vehicleType }) => {
  const system = `You are a friendly customer support agent for DeliverPro.
Explain the delivery charge in 2-3 simple, friendly sentences. Use ₹ symbol. End with reassurance.`;
  return runAgent(
    system,
    `Explain: Total ₹${totalAmount} = Base ₹${basePrice} + Fee ₹${deliveryFee} | ${distance}km | ${weight}kg | ${vehicleType}`,
    []
  );
};

const packagingAdvice = async (itemDescription) => {
  const system = `You are a packaging expert for a delivery service.
Give 4-5 practical packing tips as a bulleted list for the item described. Be concise and specific.`;
  return runAgent(system, `Packing tips for: ${itemDescription}`, []);
};

const generateSmartReply = async ({ customerMessage, orderStatus }) => {
  const system = `You are helping a delivery driver reply to a customer message.
Write a short (2-3 sentence), polite, professional reply. Sound human and reassuring.
Current order status: ${orderStatus || 'in progress'}`;
  return runAgent(system, `Customer: "${customerMessage}" → Generate driver reply:`, []);
};

const summarizeDeliveryNotes = async (notes) => {
  const system = `Summarize customer delivery instructions for a driver as a numbered action list. Max 4 items. Be brief and clear.`;
  return runAgent(system, `Instructions: "${notes}"`, []);
};

const adminQuery = async (question) => {
  const system = `You are an AI business analyst for DeliverPro.
Use the tools to get real data and answer the admin's question.
Be concise, highlight key numbers, and give 1 actionable recommendation at the end.`;
  return runAgent(system, question, [ALL_TOOLS[2], ALL_TOOLS[3]]);
};

const detectFraud = async (driverId) => {
  const system = `You are a fraud analyst for a delivery platform.
Analyze the driver behavior data and give: Risk Level, Key Findings (2-3 bullets), Recommendation.`;
  return runAgent(system, `Analyze driver ${driverId} for suspicious patterns over 14 days`, [ALL_TOOLS[3]]);
};

module.exports = {
  bookingAssistant,
  explainPrice,
  packagingAdvice,
  generateSmartReply,
  summarizeDeliveryNotes,
  adminQuery,
  detectFraud,
};