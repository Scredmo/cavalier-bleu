"use client";

import { useState } from "react";

export type Employee = {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  address?: string;
  contractHours?: number;
  rateNet?: number;
  rateBrut?: number;
};

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: "1",
      name: "Aurélie",
      role: "Patron",
      phone: "",
      email: "",
      address: "",
      contractHours: 151.67,
      rateNet: 12,
      rateBrut: 18,
    },
    {
      id: "2",
      name: "Hadrien",
      role: "Responsable",
      contractHours: 151.67,
      rateNet: 11,
      rateBrut: 17,
    },
  ]);

  function addEmployee(emp: Employee) {
    setEmployees((curr) => [...curr, emp]);
  }

  function updateEmployee(id: string, data: Partial<Employee>) {
    setEmployees((curr) =>
      curr.map((e) => (e.id === id ? { ...e, ...data } : e))
    );
  }

  function deleteEmployee(id: string) {
    setEmployees((curr) => curr.filter((e) => e.id !== id));
  }

  return { employees, addEmployee, updateEmployee, deleteEmployee };
}