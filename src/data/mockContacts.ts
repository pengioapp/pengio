export interface MockContact {
  id: number;
  name: string;
  avatar: string;
  phone: string;
  email?: string;
}

const allContacts: MockContact[] = [
  { id: 1, name: "Anna Kristoffersen", avatar: "AK", phone: "+47 912 34 567", email: "anna@test.com" },
  { id: 2, name: "Erik Johansen", avatar: "EJ", phone: "+47 987 65 432", email: "erik@test.com" },
  { id: 3, name: "Lydia Bergson", avatar: "LB", phone: "+47 923 45 678" },
  { id: 4, name: "Cristofer Dias", avatar: "CD", phone: "+47 934 56 789" },
  { id: 5, name: "Miracle Saris", avatar: "MS", phone: "+47 945 67 890" },
];

export const avatarColors = ["bg-pengio-green", "bg-pengio-blue", "bg-pengio-orange", "bg-pengio-purple", "bg-pengio-green"];

/** Returns all contacts except the currently logged-in user */
export const getContactsForUser = (userEmail: string | undefined): MockContact[] => {
  if (!userEmail) return allContacts;
  return allContacts.filter((c) => c.email?.toLowerCase() !== userEmail.toLowerCase());
};
