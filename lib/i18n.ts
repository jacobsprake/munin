/**
 * Internationalization (i18n) Scaffolding
 * 
 * Provides basic i18n support for multiple languages in the UI.
 * Air-gap compatible (no cloud translation services).
 */

export type SupportedLanguage = 'en' | 'de' | 'fr' | 'es' | 'it';

export interface Translations {
  [key: string]: string | Translations;
}

const TRANSLATIONS: Record<SupportedLanguage, Translations> = {
  en: {
    dashboard: {
      title: 'Munin Dashboard',
      stationReadings: 'Station Readings',
      pendingApprovals: 'Pending Approvals',
      performanceMetrics: 'Performance Metrics',
    },
    simulation: {
      title: 'Incident Simulation',
      cascadePrediction: 'Cascade Prediction',
      timeline: 'Timeline',
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      approve: 'Approve',
      cancel: 'Cancel',
      save: 'Save',
    },
  },
  de: {
    dashboard: {
      title: 'Munin Dashboard',
      stationReadings: 'Messwerte',
      pendingApprovals: 'Ausstehende Genehmigungen',
      performanceMetrics: 'Leistungsmetriken',
    },
    simulation: {
      title: 'Vorfallsimulation',
      cascadePrediction: 'Kaskadenvorhersage',
      timeline: 'Zeitachse',
    },
    common: {
      loading: 'Lädt...',
      error: 'Fehler',
      success: 'Erfolg',
      approve: 'Genehmigen',
      cancel: 'Abbrechen',
      save: 'Speichern',
    },
  },
  fr: {
    dashboard: {
      title: 'Tableau de bord Munin',
      stationReadings: 'Lectures de station',
      pendingApprovals: 'Approbations en attente',
      performanceMetrics: 'Métriques de performance',
    },
    simulation: {
      title: 'Simulation d\'incident',
      cascadePrediction: 'Prédiction de cascade',
      timeline: 'Chronologie',
    },
    common: {
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      approve: 'Approuver',
      cancel: 'Annuler',
      save: 'Enregistrer',
    },
  },
  es: {
    dashboard: {
      title: 'Panel de Munin',
      stationReadings: 'Lecturas de estación',
      pendingApprovals: 'Aprobaciones pendientes',
      performanceMetrics: 'Métricas de rendimiento',
    },
    simulation: {
      title: 'Simulación de incidente',
      cascadePrediction: 'Predicción de cascada',
      timeline: 'Línea de tiempo',
    },
    common: {
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      approve: 'Aprobar',
      cancel: 'Cancelar',
      save: 'Guardar',
    },
  },
  it: {
    dashboard: {
      title: 'Dashboard Munin',
      stationReadings: 'Letture stazione',
      pendingApprovals: 'Approvazioni in sospeso',
      performanceMetrics: 'Metriche di performance',
    },
    simulation: {
      title: 'Simulazione incidente',
      cascadePrediction: 'Previsione cascata',
      timeline: 'Cronologia',
    },
    common: {
      loading: 'Caricamento...',
      error: 'Errore',
      success: 'Successo',
      approve: 'Approva',
      cancel: 'Annulla',
      save: 'Salva',
    },
  },
};

class I18nService {
  private currentLanguage: SupportedLanguage = 'en';

  setLanguage(language: SupportedLanguage) {
    this.currentLanguage = language;
    // In a real implementation, would persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('munin_language', language);
    }
  }

  getLanguage(): SupportedLanguage {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('munin_language');
      if (stored && Object.keys(TRANSLATIONS).includes(stored)) {
        return stored as SupportedLanguage;
      }
    }
    return this.currentLanguage;
  }

  t(key: string, params?: Record<string, string>): string {
    const keys = key.split('.');
    let value: any = TRANSLATIONS[this.getLanguage()];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English
        value = TRANSLATIONS.en;
        for (const k2 of keys) {
          if (value && typeof value === 'object' && k2 in value) {
            value = value[k2];
          } else {
            return key; // Return key if translation not found
          }
        }
        break;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey] || match;
      });
    }

    return value;
  }
}

export const i18n = new I18nService();

/**
 * React hook for translations (client-side)
 */
export function useTranslation() {
  return {
    t: (key: string, params?: Record<string, string>) => i18n.t(key, params),
    language: i18n.getLanguage(),
    setLanguage: (lang: SupportedLanguage) => i18n.setLanguage(lang),
  };
}
