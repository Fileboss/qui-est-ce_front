export interface UserCreateRequest {
  username: string;
  password: string;
  role: 'player' | 'admin';
}
