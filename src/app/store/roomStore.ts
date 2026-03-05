import { useState, useEffect } from "react";
import { rooms as initialRooms } from "../data/mockData";

// ── Types ────────────────────────────────────────────────────────────────────

export type RoomStatus = "active" | "inactive" | "maintenance";

export type Room = {
  id: string;
  companyId: string;
  unitId?: string;
  name: string;
  description: string;
  color: string;
  status: RoomStatus;
};

// ── In-memory state ──────────────────────────────────────────────────────────

let roomsState: Room[] = initialRooms.map((r) => ({ ...r }));

// roomAppointments: roomId → Set of appointmentIds currently assigned
let roomAssignments: Record<string, string> = {
  a1: "r1", a2: "r2", a3: "r3",
  a4: "r1", a5: "r2", a6: "r3",
  a7: "r2", a8: "r1",
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

// ── Store API ────────────────────────────────────────────────────────────────

export const roomStore = {
  // ── Rooms ─────────────────────────────────────────────────────────────────

  getRooms: (companyId: string): Room[] =>
    roomsState.filter((r) => r.companyId === companyId),

  getRoom: (roomId: string): Room | undefined =>
    roomsState.find((r) => r.id === roomId),

  addRoom: (room: Room) => {
    roomsState = [...roomsState, room];
    notify();
  },

  updateRoom: (updated: Room) => {
    roomsState = roomsState.map((r) => (r.id === updated.id ? updated : r));
    notify();
  },

  deleteRoom: (roomId: string) => {
    roomsState = roomsState.filter((r) => r.id !== roomId);
    // also remove assignments for this room
    Object.keys(roomAssignments).forEach((aptId) => {
      if (roomAssignments[aptId] === roomId) delete roomAssignments[aptId];
    });
    notify();
  },

  // ── Assignments ───────────────────────────────────────────────────────────

  getRoomForAppointment: (appointmentId: string): string | null =>
    roomAssignments[appointmentId] ?? null,

  assignRoom: (appointmentId: string, roomId: string) => {
    roomAssignments = { ...roomAssignments, [appointmentId]: roomId };
    notify();
  },

  unassignRoom: (appointmentId: string) => {
    const next = { ...roomAssignments };
    delete next[appointmentId];
    roomAssignments = next;
    notify();
  },

  /** Returns all appointmentIds using a given room on a given date */
  getOccupancy: (roomId: string, date: string, allAppointments: { id: string; date: string; time: string; duration: number }[]) => {
    return allAppointments.filter(
      (a) => roomAssignments[a.id] === roomId && a.date === date
    );
  },

  /** Returns which room is occupied at a specific date+time */
  isRoomBusy: (
    roomId: string,
    date: string,
    time: string,
    allAppointments: { id: string; date: string; time: string; duration: number }[],
    excludeId?: string
  ): boolean => {
    const [reqH, reqM] = time.split(":").map(Number);
    const reqStart = reqH * 60 + reqM;

    return allAppointments.some((a) => {
      if (a.id === excludeId) return false;
      if (roomAssignments[a.id] !== roomId) return false;
      if (a.date !== date) return false;
      const [aH, aM] = a.time.split(":").map(Number);
      const aStart = aH * 60 + aM;
      const aEnd = aStart + a.duration;
      return reqStart >= aStart && reqStart < aEnd;
    });
  },

  // ── Subscribe ─────────────────────────────────────────────────────────────

  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// ── React hook ───────────────────────────────────────────────────────────────

export function useRoomStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = roomStore.subscribe(() => setTick((n) => n + 1));
    return unsub;
  }, []);
  return roomStore;
}