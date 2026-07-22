"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "./useSocket"; // Adjust path to useSocket if needed
// import api from "../services/api"; // API service instance
import {matchingService} from "../services/index"; // API service instance
import toast from "react-hot-toast";

export const useOrderOffers = () => {
  const { socket, isConnected, markOfferSeen, trackOrder } = useSocket();
  const [activeOffer, setActiveOffer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  // Clean up existing timer safely
  const clearActiveTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ── Accept offer via HTTP POST API ──
  const accept = useCallback(async () => {
    if (!activeOffer) return false;
    try {
      // await api.post(`/matching/orders/${activeOffer.orderId}/offer/accept`);

      await matchingService.acceptOffer(activeOffer.orderId);

      // Connect the driver to the active tracking rooms instantly on success
      if (trackOrder) {
        trackOrder(activeOffer.orderId);
      }

      toast.success("Order accepted!");
      clearActiveTimer();
      setActiveOffer(null);
      return true;
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Failed to accept — offer may have expired",
      );
      clearActiveTimer();
      setActiveOffer(null);
      return false;
    }
  }, [activeOffer, trackOrder, clearActiveTimer]);

  // ── Reject offer via HTTP POST API ──
  const reject = useCallback(async () => {
    if (!activeOffer) return;
    try {
      // await api.post(`/matching/orders/${activeOffer.orderId}/offer/reject`);

      await matchingService.rejectOffer(activeOffer.orderId);

    } catch {
      // Silent — offer expiring naturally or quiet manual skip is fine
    } finally {
      clearActiveTimer();
      setActiveOffer(null);
    }
  }, [activeOffer, clearActiveTimer]);

  // Handle incoming order:offer socket event
  useEffect(() => {
    if (!socket?.current || !isConnected) return;

    const currentSocket = socket.current;

    const handleNewOffer = (offer) => {
      console.log("[useOrderOffers] New offer received:", offer);

      // Stop any running timer first
      clearActiveTimer();

      // Set active offer details
      setActiveOffer(offer);

      const duration = offer.expiresInSeconds || 60;
      setTimeLeft(duration);

      // Instantly mark the offer as seen on the server backend via Socket
      if (offer.orderId && markOfferSeen) {
        markOfferSeen(offer.orderId);
      }

      // Play custom incoming sound safely
      try {
        const audio = new Audio("/notification.mp3");
        audio
          .play()
          .catch((err) =>
            console.log(
              "[Audio] Playback blocked by browser policy:",
              err.message,
            ),
          );
      } catch (err) {
        console.warn(
          "[Audio] Failed to initialize notification audio stream:",
          err,
        );
      }

      // Initialize the visual countdown timer
      let remaining = duration;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearActiveTimer();
          setActiveOffer(null); // Clear the active state to close the modal
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
    };

    currentSocket.on("order:offer", handleNewOffer);
    console.log("[useOrderOffers] Hook active and listening for order offers");

    return () => {
      currentSocket.off("order:offer", handleNewOffer);
      clearActiveTimer();
    };
  }, [socket, isConnected, clearActiveTimer, markOfferSeen]);

  return {
    activeOffer,
    timeLeft,
    accept,
    reject,
    dismissOffer: () => {
      clearActiveTimer();
      setActiveOffer(null);
    },
  };
};
