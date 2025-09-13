export interface User {
  id: number;
  username: string;
  createdAt: string;
}

export interface UserState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  clearUser: () => void;
}
