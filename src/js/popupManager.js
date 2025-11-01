/* eslint-env browser */

// Управление попапами
class PopupManager {
  constructor() {
    this.activePopup = null;
    this.bodyScrollLocked = false;
    this.savedScrollY = 0;
    
    this.init();
  }

  init() {
    // Находим все попапы
    this.popups = {
      login: document.querySelector('.login-popup'),
      thanks: document.querySelector('.thanks-popup'),
      confirm: document.querySelector('.confirm-popup'),
    };

    // Устанавливаем обработчики для кнопок открытия
    this.setupOpenButtons();
    
    // Устанавливаем обработчики для закрытия
    this.setupCloseHandlers();

    // Обработка Escape для закрытия
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activePopup) {
        this.close(this.activePopup);
      }
    });
  }

  setupOpenButtons() {
    // Кнопка Login в header
    const loginButton = document.querySelector('.header_button-login');
    if (loginButton) {
      loginButton.addEventListener('click', () => {
        this.open('login');
      });
    }

    // Кнопка Join the waitlist в header
    const joinButton = document.querySelector('.header_button-join');
    if (joinButton) {
      joinButton.addEventListener('click', () => {
        // Прокручиваем к первой форме waitlist
        const heroForm = document.querySelector('.hero .hero_form');
        if (heroForm) {
          heroForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    // Кнопка "Join the waitlist" в секции turns (прокрутка к форме)
    const turnsButton = document.querySelector('.turns_button');
    if (turnsButton) {
      turnsButton.addEventListener('click', (e) => {
        e.preventDefault();
        const heroForm = document.querySelector('.hero .hero_form');
        if (heroForm) {
          heroForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }
  }

  setupCloseHandlers() {
    // Обработчики для всех кнопок закрытия
    document.querySelectorAll('.popup_close').forEach(closeButton => {
      closeButton.addEventListener('click', () => {
        const popup = closeButton.closest('.popup');
        if (popup) {
          this.close(popup);
        }
      });
    });

    // Закрытие по клику на затемненный фон (не на контент)
    Object.values(this.popups).forEach(popup => {
      if (popup) {
        popup.addEventListener('click', (e) => {
          // Если клик был именно на фоне (сам попап), а не на контенте
          if (e.target === popup) {
            this.close(popup);
          }
        });
      }
    });

    // Обработчики для кнопок "Got It" и подобных
    const thanksButton = document.querySelector('.thanks-popup .popup_button');
    if (thanksButton) {
      thanksButton.addEventListener('click', () => {
        this.close(this.popups.thanks);
      });
    }
  }

  open(popupName) {
    const popup = typeof popupName === 'string' 
      ? this.popups[popupName] 
      : popupName;

    if (!popup) {
      console.warn(`Popup "${popupName}" not found`);
      return;
    }

    // Закрываем активный попап, если есть
    if (this.activePopup && this.activePopup !== popup) {
      this.close(this.activePopup, false);
    }

    // Открываем новый попап
    this.activePopup = popup;
    
    // Показываем попап
    popup.style.display = 'block';
    
    // Блокируем скролл
    this.lockScroll();

    // Добавляем класс для анимации появления после небольшой задержки
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        popup.classList.add('popup--active');
      });
    });

    // Фокус на первый инпут, если есть форма
    const firstInput = popup.querySelector('input');
    if (firstInput) {
      setTimeout(() => {
        firstInput.focus();
      }, 200);
    }
  }

  close(popup, animate = true) {
    const popupToClose = typeof popup === 'string' 
      ? this.popups[popup] 
      : popup;

    if (!popupToClose) return;

    // Убираем класс активности для анимации закрытия
    popupToClose.classList.remove('popup--active');

    const closeCallback = () => {
      popupToClose.style.display = 'none';
      
      // Разблокируем скролл, если это был активный попап
      if (this.activePopup === popupToClose) {
        this.activePopup = null;
        this.unlockScroll();
      }
    };

    // Если нужно анимировать закрытие
    if (animate) {
      setTimeout(closeCallback, 300); // Время для анимации закрытия
    } else {
      closeCallback();
    }
  }

  lockScroll() {
    if (this.bodyScrollLocked) return;

    this.savedScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.savedScrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    this.bodyScrollLocked = true;
  }

  unlockScroll() {
    if (!this.bodyScrollLocked) return;

    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, this.savedScrollY);
    this.bodyScrollLocked = false;
  }

  // Публичные методы для открытия конкретных попапов
  openLogin() {
    this.open('login');
  }

  openThanks() {
    this.open('thanks');
  }

  openConfirm() {
    this.open('confirm');
  }
}

// Создаем глобальный экземпляр
let popupManagerInstance = null;

// Инициализация менеджера попапов
function initPopupManager() {
  popupManagerInstance = new PopupManager();
  return popupManagerInstance;
}

// Экспортируем функцию инициализации и метод для получения экземпляра
export default initPopupManager;
export function getPopupManager() {
  return popupManagerInstance;
}

