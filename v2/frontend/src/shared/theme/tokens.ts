/**
 * Theme Tokens (White-Label)
 * 
 * Definiert Theme-Variablen für White-Label-Support
 */

export interface ThemeTokens {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
  logo: string | null;
  productName: string;
  tenantName: string;
}

/**
 * Default Theme (wird von Tenant-Daten überschrieben)
 */
export const defaultTheme: ThemeTokens = {
  colors: {
    primary: '#3B82F6',
    secondary: '#64748B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#1E293B',
    textSecondary: '#64748B'
  },
  logo: null,
  productName: 'Sensarion',
  tenantName: ''
};

/**
 * Erstellt Theme aus Tenant-Daten
 */
export function createTheme(tenant: {
  primaryColor?: string | null;
  logoUrl?: string | null;
  name?: string;
}): ThemeTokens {
  return {
    ...defaultTheme,
    colors: {
      ...defaultTheme.colors,
      primary: tenant.primaryColor || defaultTheme.colors.primary
    },
    logo: tenant.logoUrl || null,
    tenantName: tenant.name || ''
  };
}

/**
 * CSS Variables für Theme
 */
export function themeToCSSVariables(theme: ThemeTokens): Record<string, string> {
  return {
    '--color-primary': theme.colors.primary,
    '--color-secondary': theme.colors.secondary,
    '--color-success': theme.colors.success,
    '--color-warning': theme.colors.warning,
    '--color-error': theme.colors.error,
    '--color-background': theme.colors.background,
    '--color-surface': theme.colors.surface,
    '--color-text': theme.colors.text,
    '--color-text-secondary': theme.colors.textSecondary
  };
}

