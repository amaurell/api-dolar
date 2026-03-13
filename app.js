/**
 * @fileoverview Application entry point using OOP and SOLID principles.
 * improved with OWASP security best practices (Input Validation, Output Encoding).
 */

// --- 1. Security & Utilities (OWASP & SOLID: SRP) ---

/**
 * Responsible for sanitizing inputs/outputs to prevent XSS.
 */
class DOMSanitizer {
  /**
   * Escape HTML characters to prevent XSS.
   * @param {string} str - The string to sanitize.
   * @returns {string} - The sanitized string.
   */
  static escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, function (m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }
}

/**
 * Responsible for formatting currency values.
 */
class CurrencyFormatter {
  /**
   * Formats a number to Brazilian Real currency style.
   * @param {number|string} value - The value to format.
   * @returns {string} - Formatted string (e.g., "5,25").
   */
  static formatBRL(value) {
    const number = Number(value);
    if (isNaN(number)) throw new Error("Invalid number for formatting");

    return number.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Formats a date object to a time string.
   * @param {Date} date - The date to format.
   * @returns {string} - Formatted time (e.g., "14:30").
   */
  static formatTime(date) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
}

// --- 2. Data Layer (SOLID: SRP, DIP) ---

/**
 * Service responsible for fetching data from external APIs.
 */
class CurrencyService {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  /**
   * Fetches the latest quote for a currency pair.
   * @returns {Promise<Object>} - The API response data.
   */
  async getLatestQuote() {
    try {
      const response = await fetch(this.apiUrl);

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }

      const data = await response.json();

      // OWASP: Identify and validate data structure immediately
      if (!data || !data.USDBRL || !data.USDBRL.bid) {
        throw new Error("Invalid API response structure");
      }

      return data;
    } catch (error) {
      console.error("CurrencyService Error:", error);
      throw error;
    }
  }
}

// --- 3. UI Layer (SOLID: SRP) ---

/**
 * Manages DOM elements and updates.
 */
class UIManager {
  constructor() {
    this.dolarElement = document.getElementById("dolar");
    this.refreshBtn = document.getElementById("refresh-btn");
    this.updateTimeElement = document.getElementById("update-time");
    this.statusBadge = document.getElementById("status-badge");
    // Securely selecting the span
    this.refreshBtnSpan = this.refreshBtn ? this.refreshBtn.querySelector('span') : null;
  }

  /**
   * Updates the currency display.
   * @param {string} value - The formatted currency value.
   */
  updateCurrency(value) {
    if (!this.dolarElement) return;
    // OWASP: Use textContent instead of innerHTML to prevent XSS
    this.dolarElement.textContent = DOMSanitizer.escapeHTML(value);
  }

  /**
   * Updates the last updated time.
   */
  updateTime() {
    if (!this.updateTimeElement) return;
    const timeString = CurrencyFormatter.formatTime(new Date());
    this.updateTimeElement.textContent = `Atualizado às ${DOMSanitizer.escapeHTML(timeString)}`;
  }

  /**
   * Updates the UI loading state.
   * @param {boolean} isLoading 
   */
  setLoadingState(isLoading) {
    if (!this.refreshBtn) return;

    if (isLoading) {
      this.refreshBtn.classList.add('loading');
      this.refreshBtn.disabled = true;
      if (this.refreshBtnSpan) this.refreshBtnSpan.textContent = "Atualizando...";
    } else {
      this.refreshBtn.classList.remove('loading');
      this.refreshBtn.disabled = false;
      if (this.refreshBtnSpan) this.refreshBtnSpan.textContent = "Atualizar";
    }
  }

  /**
   * Displays an error state in the UI.
   */
  showError() {
    if (this.dolarElement) this.dolarElement.textContent = "---";
    if (this.updateTimeElement) this.updateTimeElement.textContent = "Erro de conexão";
  }
}

// --- 4. Application Logic (Controller) ---

/**
 * Main application controller.
 * Orchestrates the interaction between Service and UI.
 */
class CurrencyApp {
  constructor(service, uiManager) {
    this.service = service;
    this.uiManager = uiManager;
  }

  /**
   * Initializes the application.
   */
  init() {
    // Initial Load
    this.loadData();
    // Bind Events
    this.bindEvents();
  }

  /**
   * Binds UI events.
   */
  bindEvents() {
    if (this.uiManager.refreshBtn) {
      this.uiManager.refreshBtn.addEventListener("click", () => this.loadData());
    }
  }

  /**
   * Orchestrates the data loading flow.
   */
  async loadData() {
    this.uiManager.setLoadingState(true);

    try {
      const data = await this.service.getLatestQuote();
      const bidValue = data.USDBRL.bid;

      const formattedValue = CurrencyFormatter.formatBRL(bidValue);

      this.uiManager.updateCurrency(formattedValue);
      this.uiManager.updateTime();

    } catch (error) {
      this.uiManager.showError();
    } finally {
      this.uiManager.setLoadingState(false);
    }
  }
}

// --- 5. Composition Root (Dependency Injection) ---

document.addEventListener('DOMContentLoaded', () => {
  // Dependencies
  const apiURL = "https://economia.awesomeapi.com.br/json/last/USD-BRL";
  const currencyService = new CurrencyService(apiURL);
  const uiManager = new UIManager();

  // Inject dependencies logic
  const app = new CurrencyApp(currencyService, uiManager);

  // Start App
  app.init();
});