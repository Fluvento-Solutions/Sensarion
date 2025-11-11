export type PracticeSummary = {
  id: string;
  name: string;
  code: string;
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

const defaultHeaders: HeadersInit = {
  'Content-Type': 'application/json'
};

export const devLogin = async (
  email: string,
  password?: string
): Promise<UserProfile> => {
  const response = await fetch('/api/auth/dev-login', {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? 'Login fehlgeschlagen');
  }

  const { user } = await response.json();
  return user as UserProfile;
};

export const fetchProfile = async (userId: string): Promise<UserProfile> => {
  const response = await fetch(`/api/auth/profile/${userId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? 'Profil konnte nicht geladen werden');
  }

  const { user } = await response.json();
  return user as UserProfile;
};

