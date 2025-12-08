import React from 'react';

export interface Student {
  id: string;
  fullName: string;
  course: number;
  group: string;
  faculty: string;
  direction: string;
  imageUrl?: string;
  joinedDate: string;
}

export interface Room {
  number: number;
  capacity: number;
  students: Student[];
}

export interface Dormitory {
  id: number;
  name: string;
  totalRooms: number;
  rooms: Room[];
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  DORM1 = 'DORM1',
  DORM2 = 'DORM2',
  AI_ASSISTANT = 'AI_ASSISTANT',
}

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}