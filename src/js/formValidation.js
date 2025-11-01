/* eslint-env browser */

// Валидация форм
class FormValidator {
  constructor(form) {
    this.form = form;
    this.inputs = form.querySelectorAll('input[type="text"], input[type="email"]');
    this.errors = new Map();
    
    this.init();
  }

  init() {
    // Добавляем обработчик отправки формы
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      if (this.validate()) {
        // Если валидация прошла успешно, можно отправить форму
        this.handleSubmit();
      } else {
        // Показываем ошибки
        this.showErrors();
      }
    });

    // Добавляем валидацию в реальном времени при потере фокуса
    this.inputs.forEach(input => {
      input.addEventListener('blur', () => {
        this.validateField(input);
        this.updateFieldError(input);
      });

      // Убираем ошибку при вводе
      input.addEventListener('input', () => {
        if (this.errors.has(input)) {
          this.clearFieldError(input);
        }
      });
    });
  }

  validate() {
    this.errors.clear();
    let isValid = true;

    this.inputs.forEach(input => {
      const fieldValid = this.validateField(input);
      if (!fieldValid) {
        isValid = false;
      }
    });

    return isValid;
  }

  validateField(input) {
    const value = input.value.trim();
    const type = input.type;
    const id = input.id || input.name;
    let isValid = true;
    let errorMessage = '';

    // Пропускаем скрытые поля
    if (input.type === 'hidden' || input.style.display === 'none') {
      return true;
    }

    // Поле name (обязательное)
    if (id === 'name' || id === 'name-join') {
      if (!value) {
        isValid = false;
        errorMessage = 'Name is required';
      } else if (value.length < 2) {
        isValid = false;
        errorMessage = 'Name must be at least 2 characters';
      } else if (value.length > 100) {
        isValid = false;
        errorMessage = 'Name must be less than 100 characters';
      }
    }
    // Поле email (обязательное)
    else if (type === 'email') {
      if (!value) {
        isValid = false;
        errorMessage = 'Email is required';
      } else if (!this.isValidEmail(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid email address';
      }
    }
    // Поле referral code (опциональное, но если заполнено - проверяем)
    else if (id === 'referral' || id === 'referral-join') {
      // Referral code опциональное, но если заполнено - проверяем длину
      if (value && value.length > 0) {
        if (value.length < 3) {
          isValid = false;
          errorMessage = 'Referral code must be at least 3 characters';
        } else if (value.length > 50) {
          isValid = false;
          errorMessage = 'Referral code must be less than 50 characters';
        }
      }
    }
    // Для других текстовых полей - базовая проверка
    else if (type === 'text' && input.hasAttribute('required')) {
      if (!value) {
        isValid = false;
        errorMessage = 'This field is required';
      }
    }

    if (!isValid) {
      this.errors.set(input, errorMessage);
    } else {
      this.errors.delete(input);
    }

    return isValid;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  showErrors() {
    this.inputs.forEach(input => {
      this.updateFieldError(input);
    });
  }

  getFieldId(input) {
    // Генерируем уникальный идентификатор для поля
    if (input.id) {
      return input.id;
    }
    
    // Для email полей используем индекс в форме
    if (input.type === 'email') {
      const emailInputs = Array.from(this.form.querySelectorAll('input[type="email"]'));
      const index = emailInputs.indexOf(input);
      return `email-${index}`;
    }
    
    // Для других полей используем тип и индекс
    const typeInputs = Array.from(this.form.querySelectorAll(`input[type="${input.type}"]`));
    const index = typeInputs.indexOf(input);
    return `${input.type}-${index}`;
  }

  updateFieldError(input) {
    const wrapper = input.closest('.input-wrapper');
    if (!wrapper) return;

    // Получаем уникальный идентификатор поля
    const fieldId = this.getFieldId(input);
    
    // Удаляем старые сообщения об ошибках для этого поля
    const parent = wrapper.parentNode;
    const existingError = parent.querySelector(`.error-message[data-field-error="${fieldId}"]`);
    if (existingError) {
      existingError.remove();
    }

    // Убираем класс ошибки
    wrapper.classList.remove('input-wrapper--error');

    // Если есть ошибка для этого поля
    if (this.errors.has(input)) {
      wrapper.classList.add('input-wrapper--error');
      
      // Создаем элемент с сообщением об ошибке
      const errorElement = document.createElement('span');
      errorElement.className = 'error-message';
      errorElement.setAttribute('data-field-error', fieldId);
      errorElement.textContent = this.errors.get(input);
      
      // Вставляем сообщение об ошибке после input-wrapper
      wrapper.parentNode.insertBefore(errorElement, wrapper.nextSibling);
    }
  }

  clearFieldError(input) {
    const wrapper = input.closest('.input-wrapper');
    if (!wrapper) return;

    wrapper.classList.remove('input-wrapper--error');
    
    // Удаляем сообщение об ошибке для этого поля
    const fieldId = this.getFieldId(input);
    const parent = wrapper.parentNode;
    const errorElement = parent.querySelector(`.error-message[data-field-error="${fieldId}"]`);
    if (errorElement) {
      errorElement.remove();
    }
    
    this.errors.delete(input);
  }

  handleSubmit() {
    // Здесь можно добавить логику отправки формы
    // Например, открыть popup с подтверждением
    const data = {};
    
    this.inputs.forEach(input => {
      if (input.type === 'email') {
        data.email = input.value.trim();
      } else if (input.id === 'name' || input.id === 'name-join') {
        data.name = input.value.trim();
      } else if (input.id === 'referral' || input.id === 'referral-join') {
        const referralValue = input.value.trim();
        if (referralValue) {
          data.referral = referralValue;
        }
      }
    });

    console.log('Form data:', data);
    
    // Динамически импортируем popupManager, чтобы избежать циклических зависимостей
    import('./popupManager.js').then(({ getPopupManager }) => {
      const popupManager = getPopupManager();
      
      if (!popupManager) {
        console.warn('PopupManager not initialized');
        return;
      }

      // Если это форма входа в login-popup:
      if (this.form.classList.contains('login-popup_form')) {
        // Закрываем текущий попап (login)
        popupManager.close('login');
        
        // Открываем попап подтверждения
        setTimeout(() => {
          popupManager.openConfirm();
        }, 300);
      }
      // Если это форма waitlist (hero_form):
      else if (this.form.classList.contains('hero_form')) {
        // Очищаем форму
        this.inputs.forEach(input => {
          input.value = '';
        });
        
        // Закрываем все попапы, если открыты
        popupManager.close('login');
        popupManager.close('confirm');
        
        // Открываем попап благодарности
        setTimeout(() => {
          popupManager.openThanks();
        }, 100);
      }
      // Если это форма повторной отправки в confirm-popup:
      else if (this.form.classList.contains('confirm-popup_form')) {
        // Просто показываем сообщение (можно добавить логику повторной отправки)
        console.log('Resend link requested');
        // Здесь можно добавить логику повторной отправки ссылки
      }
    });
  }
}

// Инициализация валидации для всех форм
function initFormValidation() {
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    new FormValidator(form);
  });
}

export default initFormValidation;

