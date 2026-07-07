'use client';
import { useState, useCallback } from 'react';
import api from '../services/api';

export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const call = useCallback(async (fn) => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      const msg = err.response?.data?.message || 'AI request failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Customer ─────────────────────────────────────────────
  const bookingAssistant = useCallback((message) =>
    call(async () => {
      const { data } = await api.post('/ai/booking-assistant', { message });
      return data.data;
    }), [call]);

  const explainPrice = useCallback((priceData) =>
    call(async () => {
      const { data } = await api.post('/ai/explain-price', priceData);
      return data.data.explanation;
    }), [call]);

  const packagingAdvice = useCallback((item) =>
    call(async () => {
      const { data } = await api.post('/ai/packaging-advice', { item });
      return data.data.advice;
    }), [call]);

  // ── Driver ───────────────────────────────────────────────
  const smartReply = useCallback((customerMessage, orderStatus) =>
    call(async () => {
      const { data } = await api.post('/ai/smart-reply', { customerMessage, orderStatus });
      return data.data.reply;
    }), [call]);

  const summarizeNotes = useCallback((notes) =>
    call(async () => {
      const { data } = await api.post('/ai/summarize-notes', { notes });
      return data.data.summary;
    }), [call]);

  // ── Admin ────────────────────────────────────────────────
  const adminQuery = useCallback((question) =>
    call(async () => {
      const { data } = await api.post('/ai/admin-query', { question });
      return data.data.answer;
    }), [call]);

  const checkFraud = useCallback((driverId) =>
    call(async () => {
      const { data } = await api.get(`/ai/fraud-check/${driverId}`);
      return data.data.analysis;
    }), [call]);

  return {
    loading, error,
    bookingAssistant, explainPrice, packagingAdvice,
    smartReply, summarizeNotes,
    adminQuery, checkFraud,
  };
};