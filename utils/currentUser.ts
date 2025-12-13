// utils/currentUser.ts

export type AppRole = "Patron" | "Responsable" | "Barman" | "Cuisine" | "Serveur";

export type CurrentUser = {
  id: string;
  firstName: string;
  lastName?: string;
  role: AppRole;
  avatarUrl?: string; // plus tard: photo uploadée
};

export const currentUser: CurrentUser = {
  id: "u_amine",
  firstName: "Amine",
  lastName: "",
  role: "Serveur",
  avatarUrl: "/avatar-test.png",
};