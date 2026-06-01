import React from 'react';

export type UserRole = 'SUPER_ADMIN' | 'DORM1_ADMIN' | 'DORM2_ADMIN' | 'GUEST';

export interface Student {
  id: string; // Tizim ichki ID si
  hemisId: string; // Hemis student_id si
  fullName: string;
  course: number;
  group: string;
  faculty: string;
  direction: string;
  imageUrl?: string;
  joinedDate: string;
}

export interface ArchivedStudent extends Student {
  exitDate: string;
  dormName: string;
}

export interface AdminRequest {
  id: string;
  type: 'ADD' | 'REMOVE';
  dormId: number;
  roomNumber: number;
  student: Student;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  resolvedAt?: string;
  isReadByAdmin?: boolean;
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
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  DORM1 = 'DORM1',
  DORM2 = 'DORM2',
  AI_ASSISTANT = 'AI_ASSISTANT',
  REQUESTS = 'REQUESTS',
  ARCHIVE = 'ARCHIVE',
  MY_REQUESTS = 'MY_REQUESTS'
}

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}