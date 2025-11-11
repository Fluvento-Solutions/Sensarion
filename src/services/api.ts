export type PracticeSummary = {
  id: string;
  name: string;
  code: string;
  logoUrl?: string | null;
};

export type TeamSummary = {
  id: string;
  name: string;
  role: string;
};

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  shortName: string;
  practice: PracticeSummary;
  teams: TeamSummary[];
  isPracticeAdmin: boolean;
};

type AuthSuccessResponse = {
  status: 'ok';
  token: string;
  user: UserProfile;
};

type AuthErrorResponse = {
  status: 'error';
  message: string;
  code?: string;
};

const defaultHeaders: HeadersInit = {
  'Content-Type': 'application/json'
};

const handleJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as AuthErrorResponse;
    throw new Error(error.message ?? 'Unbekannter API-Fehler');
  }

  return response.json() as Promise<T>;
};

export const login = async (email: string, password: string): Promise<AuthSuccessResponse> => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ email, password })
  });

  return handleJson<AuthSuccessResponse>(response);
};

export const devLogin = async (
  email: string,
  password?: string
): Promise<AuthSuccessResponse> => {
  const response = await fetch('/api/auth/dev-login', {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ email, password })
  });

  return handleJson<AuthSuccessResponse>(response);
};

export const logout = async (token: string) => {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    headers: {
      ...defaultHeaders,
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? 'Logout fehlgeschlagen');
  }
};

type ProfileSuccessResponse = {
  status: 'ok';
  user: UserProfile;
};

export const fetchProfile = async (userId: string, token: string): Promise<UserProfile> => {
  const response = await fetch(`/api/auth/profile/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await handleJson<ProfileSuccessResponse>(response);
  return data.user;
};

