const USER_KEY = "currentUser";

export const getStoredUser = () => {
  const rawUser = localStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

export const persistSession = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem(USER_KEY);
};
