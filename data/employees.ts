"use client";

import { useState } from "react";

export type Employee = {
  id: string;
  name: string;
  role: string;

  phone?: string;
  email?: string;
  address?: string;
  birthdate?: string;

  contractHours?: number; // heures mensuelles du contrat
  hourlyRate?: number;    // taux net

  ssn?: string;           // Sécurité sociale
  rib?: string;           // RIB
};

const INITIAL_EMPLOYEES: Employee[] = [
  { id: "1", name: "Aurélie", role: "Patron", contractHours: 169, hourlyRate: 20 },
  { id: "2", name: "Hadrien", role: "Responsable", contractHours: 169, hourlyRate: 15 },
  { id: "3", name: "Eric", role: "Responsable", contractHours: 169, hourlyRate: 15 },
  { id: "4", name: "Harouna", role: "Barman", contractHours: 130, hourlyRate: 13 },
  { id: "5", name: "Raja", role: "Cuisine", contractHours: 169, hourlyRate: 12 },
  { id: "6", name: "Pirakash", role: "Cuisine", contractHours: 169, hourlyRate: 12 },
  { id: "7", name: "Alan", role: "Cuisine", contractHours: 169, hourlyRate: 12 },
  { id: "8", name: "Amine", role: "Serveur", contractHours: 130, hourlyRate: 12 },
  { id: "9", name: "Tom", role: "Serveur", contractHours: 130, hourlyRate: 12 },
  { id: "10", name: "Nazario", role: "Serveur", contractHours: 130, hourlyRate: 12 },
];

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);

  function addEmployee(emp: Employee) {
    setEmployees((prev) => [...prev, emp]);
  }

  function updateEmployee(id: string, data: Partial<Employee>) {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...data } : e))
    );
  }

  function deleteEmployee(id: string) {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  }

  return { employees, addEmployee, updateEmployee, deleteEmployee };
}