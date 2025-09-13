export interface IUser {
  id: number;
  username: string;
  createdAt: string;
}

export interface ILoginResponse {
  accessToken: string;
}

export interface IRegisterResponse {
  id: number;
  username: string;
  createdAt: string;
}

export interface IAuthCredentials {
  username: string;
  password: string;
}
