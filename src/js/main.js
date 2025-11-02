/* eslint-env browser */
import initFormValidation from './formValidation.js';
import initPopupManager from './popupManager.js';

// Блокировка скролла и анимация разлета баннеров для секции check-in
function initCheckInAnimation() {
  const checkInSection = document.querySelector('.check-in');
  if (!checkInSection) return;

  const banners = checkInSection.querySelectorAll('.check-in_banner');
  const body = document.body;

  if (banners.length === 0) return;

  let isSectionActive = false;
  let scrollProgress = 0;
  let isAnimating = false;
  let rafId = null;
  let savedScrollY = 0;
  let centerX = 0;
  let centerY = 0;
  let initialPositions = [];
  let hasAnimationPlayed = false; // Флаг для отслеживания, была ли анимация уже воспроизведена

  // Направления разлета от центра (нормализованные векторы)
  const directions = [
    { x: -0.8, y: -0.6 }, // влево-вверх
    { x: 0.9, y: -0.4 }, // вправо-вверх
    { x: 0.6, y: 0.8 }, // вправо-вниз
    { x: -0.7, y: 0.7 }, // влево-вниз
    { x: 0, y: -1 }, // вверх
    { x: -1, y: 0 }, // влево
    { x: 0.8, y: 0.6 }, // вправо-вниз
  ];

  // Блокировка скролла страницы
  const lockScroll = () => {
    savedScrollY = window.scrollY;
    body.style.position = 'fixed';
    body.style.top = `-${savedScrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
  };

  // Разблокировка скролла страницы
  const unlockScroll = () => {
    body.style.position = '';
    body.style.top = '';
    body.style.width = '';
    body.style.overflow = '';
    window.scrollTo(0, savedScrollY);
  };

  // Вычисление центра контейнера и начальных позиций
  const calculateInitialPositions = () => {
    const container = checkInSection.querySelector('.container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    centerX = containerRect.left + containerRect.width / 2;
    centerY = containerRect.top + containerRect.height / 2;

    // Сохраняем начальные позиции баннеров относительно центра
    initialPositions = Array.from(banners).map((banner) => {
      const rect = banner.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - centerX,
        y: rect.top + rect.height / 2 - centerY,
      };
    });
  };

  // Обновление позиций баннеров при скролле
  const updateBanners = () => {
    if (!isSectionActive || initialPositions.length === 0) return;

    const maxDistance = 800; // Максимальное расстояние разлета
    // Применяем easing для более плавной анимации
    const easedProgress = easeInOutCubic(scrollProgress);

    banners.forEach((banner, index) => {
      const direction = directions[index] || { x: 0, y: 0 };
      const initialPos = initialPositions[index] || { x: 0, y: 0 };
      // Плавное исчезновение
      const opacity = Math.max(0, 1 - easedProgress);
      // Плавное уменьшение масштаба
      const scale = Math.max(0.3, 1 - easedProgress * 0.7);

      // Вычисляем позицию: начальная позиция + смещение от центра
      const offsetX = direction.x * maxDistance * easedProgress;
      const offsetY = direction.y * maxDistance * easedProgress;
      const x = initialPos.x + offsetX;
      const y = initialPos.y + offsetY;

      banner.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      banner.style.opacity = opacity.toString();
    });

    // Если анимация завершена, запускаем анимацию контента
    if (scrollProgress >= 1) {
      setTimeout(() => {
        isSectionActive = false;
        window.removeEventListener('wheel', handleWheel);
        
        // Запускаем анимацию контента
        animateContent();
      }, 200);
    }
  };

  // Анимация контента: раздвижение описаний и появление join
  const animateContent = () => {
    const content = checkInSection.querySelector('.check-in_content');
    const descriptions = checkInSection.querySelectorAll('.check-in_content-description');
    const joinBlock = checkInSection.querySelector('.hero.join');

    if (!content || descriptions.length === 0 || !joinBlock) {
      unlockScroll();
      return;
    }

    // Начальное состояние: join скрыт и имеет нулевые размеры
    joinBlock.style.display = 'block';
    joinBlock.style.opacity = '0';
    joinBlock.style.transform = 'scale(0.05)';
    joinBlock.style.width = '0';
    joinBlock.style.height = '0';
    joinBlock.style.overflow = 'hidden';

    let contentProgress = 0;
    const contentDuration = 2000; // длительность анимации контента (2 секунды)
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      contentProgress = Math.min(1, elapsed / contentDuration);

      // Раздвижение описаний (происходит в первой половине)
      const descriptionsPhase = Math.min(1, contentProgress * 2); // от 0 до 1 в первой половине
      const descriptionsEased = easeInOutCubic(descriptionsPhase);

      descriptions.forEach((desc, index) => {
        // Первое описание улетает вверх, второе - вниз
        const direction = index === 0 ? -1 : 1;
        const yOffset = direction * descriptionsEased * 300; // расстояние улета
        const opacity = Math.max(0, 1 - descriptionsEased);

        desc.style.transform = `translateY(${yOffset}px)`;
        desc.style.opacity = opacity.toString();
      });

      // Появление и рост блока join (происходит во второй половине)
      if (contentProgress < 0.4) {
        // Первые 40%: раздвижение описаний, join еще очень маленький
        joinBlock.style.opacity = '0';
        joinBlock.style.transform = 'scale(0.05)';
        joinBlock.style.width = '0';
        joinBlock.style.height = '0';
      } else {
        // Остальные 60%: появление и рост join
        const joinProgress = (contentProgress - 0.4) / 0.6; // от 0 до 1 в оставшейся части
        const joinEased = easeInOutCubic(joinProgress);
        
        // Убираем ограничения размеров, чтобы блок мог показаться в полном размере
        if (joinProgress > 0.1) {
          joinBlock.style.width = '';
          joinBlock.style.height = '';
          joinBlock.style.overflow = '';
        }
        
        joinBlock.style.opacity = joinEased.toString();
        // Масштаб от 0.05 до 1
        joinBlock.style.transform = `scale(${0.05 + joinEased * 0.95})`;
      }

      if (contentProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Анимация завершена
        hasAnimationPlayed = true; // Помечаем, что анимация была воспроизведена
        unlockScroll();
        // Скрываем описания после исчезновения
        setTimeout(() => {
          descriptions.forEach((desc) => {
            desc.style.display = 'none';
          });
        }, 100);
      }
    };

    animate();
  };

  // Easing функция для плавности
  const easeInOutCubic = (t) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Обработка wheel событий
  const handleWheel = (e) => {
    if (!isSectionActive) return;

    e.preventDefault();
    e.stopPropagation();

    // Увеличиваем прогресс анимации (медленнее для плавности)
    const delta = Math.abs(e.deltaY);
    scrollProgress = Math.min(1, scrollProgress + delta / 2000);

    // Используем requestAnimationFrame для плавности
    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      updateBanners();
      rafId = null;
    });
  };

  // Intersection Observer для отслеживания секции
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        // Активируем только когда секция полностью во viewport и анимация еще не была воспроизведена
        if (entry.isIntersecting && entry.intersectionRatio >= 1) {
          if (!isSectionActive && !isAnimating && !hasAnimationPlayed) {
            isSectionActive = true;
            scrollProgress = 0;
            isAnimating = true;
            lockScroll();

            // Вычисляем начальные позиции относительно центра
            calculateInitialPositions();

            // Сбрасываем позиции баннеров (они остаются на своих местах)
            banners.forEach((banner) => {
              banner.style.opacity = '1';
            });

            // Добавляем обработчик wheel
            window.addEventListener('wheel', handleWheel, { passive: false });

            setTimeout(() => {
              isAnimating = false;
            }, 100);
          }
        } else if (
          !entry.isIntersecting &&
          isSectionActive &&
          scrollProgress < 1
        ) {
          // Если вышли из секции до завершения анимации - сбрасываем
          isSectionActive = false;
          scrollProgress = 0;
          window.removeEventListener('wheel', handleWheel);
          unlockScroll();
          banners.forEach((banner) => {
            banner.style.transform = '';
            banner.style.opacity = '';
          });
        }
      });
    },
    {
      threshold: 1.0,
      rootMargin: '0px',
    },
  );

  observer.observe(checkInSection);

  // Очистка при размонтировании
  return () => {
    observer.disconnect();
    window.removeEventListener('wheel', handleWheel);
    if (isSectionActive) {
      unlockScroll();
    }
  };
}

// Анимация стека карточек для секции how-it-works
function initHowItWorksAnimation() {
  const howItWorksSection = document.querySelector('.how-it-works');
  if (!howItWorksSection) return;

  const cards = howItWorksSection.querySelectorAll('.how-it-works_content-item-overlay');
  const body = document.body;

  if (cards.length === 0) return;

  let isSectionActive = false;
  let stackProgress = 0;
  let isAnimating = false;
  let rafId = null;
  let savedScrollY = 0;
  let hasAnimationPlayed = false;

  // Блокировка скролла страницы
  const lockScroll = () => {
    savedScrollY = window.scrollY;
    body.style.position = 'fixed';
    body.style.top = `-${savedScrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
  };

  // Разблокировка скролла страницы
  const unlockScroll = () => {
    body.style.position = '';
    body.style.top = '';
    body.style.width = '';
    body.style.overflow = '';
    window.scrollTo(0, savedScrollY);
  };

  // Easing функция для плавности
  const easeInOutCubic = (t) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Обновление позиций карточек (карточки наезжают друг на друга)
  const updateCards = () => {
    if (!isSectionActive) return;

    const cardOffset = 25; // Отступ сверху для каждой карточки (эффект колоды)
    const gap = 32; // gap между карточками (из CSS)

    cards.forEach((card, index) => {
      // Прогресс для каждой карточки (первая начинает первой)
      const cardStartProgress = index / cards.length;
      const cardEndProgress = (index + 1) / cards.length;
      
      // Вычисляем прогресс конкретной карточки
      let cardProgress = 0;
      if (stackProgress >= cardStartProgress) {
        if (stackProgress >= cardEndProgress) {
          cardProgress = 1; // Карточка полностью наехала
        } else {
          // Карточка в процессе движения
          cardProgress = (stackProgress - cardStartProgress) / (cardEndProgress - cardStartProgress);
        }
      }
      
      const eased = easeInOutCubic(cardProgress);

      // Смещение: карточки двигаются вверх и наезжают друг на друга
      let yOffset = 0;
      if (index > 0) {
        // Начальное расстояние от первой карточки (в исходном состоянии с gap)
        let initialDistance = 0;
        for (let i = 0; i < index; i++) {
          initialDistance += cards[i].offsetHeight + gap;
        }
        
        // Финальное расстояние в стеке (карточки лежат друг на друге)
        // В стеке каждая карточка смещена только на отступ
        const finalDistance = cardOffset * index;
        
        // Интерполируем между начальной и конечной позицией
        yOffset = -(initialDistance - finalDistance) * eased;
      }

      // Z-index: каждая следующая карточка выше предыдущей
      const zIndex = index + 1 + Math.floor(eased * 5);
      card.style.zIndex = zIndex.toString();

      card.style.transform = `translateY(${yOffset}px)`;
    });
  };

  // Обработка wheel событий
  const handleWheel = (e) => {
    if (!isSectionActive) return;

    e.preventDefault();
    e.stopPropagation();

    // Определяем направление скролла
    const delta = e.deltaY;
    const scrollDirection = delta > 0 ? 1 : -1; // 1 = вниз, -1 = вверх

    // Изменяем прогресс в зависимости от направления
    if (scrollDirection > 0) {
      // Скролл вниз - увеличиваем прогресс
      stackProgress = Math.min(1, stackProgress + Math.abs(delta) / 800);
    } else {
      // Скролл вверх - уменьшаем прогресс (карточки возвращаются на место)
      stackProgress = Math.max(0, stackProgress - Math.abs(delta) / 800);
    }

    // Используем requestAnimationFrame для плавности
    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      updateCards();
      
      // Если анимация завершена (прогресс = 1), разблокируем скролл через небольшую задержку
      if (stackProgress >= 1) {
        setTimeout(() => {
          isSectionActive = false;
          window.removeEventListener('wheel', handleWheel);
          unlockScroll();
          hasAnimationPlayed = true;
        }, 300);
      }
      // Если прогресс вернулся к 0 (карточки полностью на месте), но остаемся в режиме анимации
      // чтобы можно было снова прокручивать вниз
      else if (stackProgress <= 0) {
        // Карточки уже на месте благодаря updateCards(), ничего не делаем
        // остаемся в режиме анимации для возможности дальнейшей прокрутки
      }
      
      rafId = null;
    });
  };

  // Проверка, находится ли верх секции на уровне верха viewport
  const checkSectionPosition = () => {
    const rect = howItWorksSection.getBoundingClientRect();
    const tolerance = 10; // Допустимая погрешность в пикселях
    
    // Если анимация уже была воспроизведена полностью, не активируем заново
    if (hasAnimationPlayed && !isSectionActive) return;
    
    // Проверяем, находится ли верх секции на уровне верха viewport или выше
    // и секция видна в viewport
    const isAtTop = rect.top <= tolerance && rect.top >= -tolerance && rect.bottom > 0;
    const isNearTop = rect.top < window.innerHeight * 0.3 && rect.top > -100 && rect.bottom > 0;
    
    // Если секция находится на верху или близко к верху, активируем анимацию
    if ((isAtTop || isNearTop) && !isSectionActive && !isAnimating) {
      isAnimating = true;
      
      // Если нужно подкорректировать позицию (больше допустимой погрешности)
      if (Math.abs(rect.top) > tolerance / 2) {
        window.scrollTo({
          top: window.scrollY + rect.top,
          behavior: 'smooth'
        });
        setTimeout(() => {
          activateAnimation();
        }, 300);
      } else {
        activateAnimation();
      }
    }
    
    // Если пользователь прокрутил далеко от секции, выходим из режима анимации
    if (isSectionActive && (rect.top > window.innerHeight || rect.bottom < 0)) {
      isSectionActive = false;
      stackProgress = 0;
      window.removeEventListener('wheel', handleWheel);
      unlockScroll();
      // Сбрасываем позиции карточек
      cards.forEach((card, index) => {
        card.style.transform = '';
        card.style.zIndex = (index + 1).toString();
      });
      hasAnimationPlayed = false;
    }
    // Если пользователь вернулся к секции после прокрутки вниз, сбрасываем флаг hasAnimationPlayed
    else if (!isSectionActive && hasAnimationPlayed && isNearTop && rect.top > -50) {
      hasAnimationPlayed = false;
    }
  };

  // Активация анимации
  const activateAnimation = () => {
    isSectionActive = true;
    isAnimating = false;
    stackProgress = 0;
    lockScroll();
    
    // Сбрасываем позиции карточек
    cards.forEach((card, index) => {
      card.style.transform = '';
      card.style.zIndex = (index + 1).toString();
    });
    
    // Добавляем обработчик wheel
    window.addEventListener('wheel', handleWheel, { passive: false });
  };

  // Intersection Observer для отслеживания приближения к секции
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        // Когда секция видна, начинаем проверять позицию
        if (entry.isIntersecting && !hasAnimationPlayed) {
          checkSectionPosition();
        }
      });
    },
    {
      threshold: [0, 0.1, 0.3, 0.5],
      rootMargin: '100px 0px' // Расширяем зону срабатывания
    }
  );

  observer.observe(howItWorksSection);

  // Проверяем при скролле более часто
  let scrollCheckRaf = null;
  const handleScrollCheck = () => {
    if (isAnimating && !isSectionActive) return;
    
    if (scrollCheckRaf) {
      cancelAnimationFrame(scrollCheckRaf);
    }
    
    scrollCheckRaf = requestAnimationFrame(() => {
      const rect = howItWorksSection.getBoundingClientRect();
      // Проверяем, если секция находится в области viewport или чуть выше/ниже
      if (rect.top < window.innerHeight + 200 && rect.bottom > -200) {
        checkSectionPosition();
      } else if (isSectionActive) {
        // Если секция ушла из viewport, сбрасываем анимацию
        checkSectionPosition();
      }
      scrollCheckRaf = null;
    });
  };

  window.addEventListener('scroll', handleScrollCheck, { passive: true });
}

// Анимация прогресс-бара на странице профиля
function initProfileProgressAnimation() {
  const progressSection = document.querySelector('.profile_progress');
  if (!progressSection) return;

  const progressFill = progressSection.querySelector('.profile_progress-bar-fill');
  const progressNumber = progressSection.querySelector('.profile_progress-number');
  
  if (!progressFill || !progressNumber) return;

  // Получаем целевой процент из data-атрибута или из текста
  const targetPercent = parseInt(progressNumber.dataset.target || progressNumber.textContent.replace('%', ''), 10);
  
  if (isNaN(targetPercent) || targetPercent < 0 || targetPercent > 100) return;

  // Константы для расчета
  const circumference = 534.07; // 2 * Math.PI * 85 (радиус окружности)
  const startOffset = circumference; // Начинаем с полного круга (0%)
  const targetOffset = circumference * (1 - targetPercent / 100); // Финальное смещение

  // Easing функция для плавной анимации
  const easeOutCubic = (t) => {
    return 1 - Math.pow(1 - t, 3);
  };

  // Параметры анимации
  const duration = 1500; // Длительность анимации в миллисекундах
  const startTime = Date.now();
  let currentPercent = 0;

  // Функция анимации
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1, elapsed / duration);
    const easedProgress = easeOutCubic(progress);

    // Вычисляем текущий процент и offset
    currentPercent = Math.floor(easedProgress * targetPercent);
    const currentOffset = startOffset - (startOffset - targetOffset) * easedProgress;

    // Обновляем SVG через CSS переменную
    progressSection.style.setProperty('--progress-offset', `${currentOffset}`);

    // Обновляем текст
    progressNumber.textContent = `${currentPercent}%`;

    // Продолжаем анимацию, если не достигли цели
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Убеждаемся, что финальные значения точные
      progressSection.style.setProperty('--progress-offset', `${targetOffset}`);
      progressNumber.textContent = `${targetPercent}%`;
    }
  };

  // Запускаем анимацию с небольшой задержкой для лучшего эффекта
  setTimeout(() => {
    requestAnimationFrame(animate);
  }, 300);
}

// Инициализация копирования реферальной ссылки
function initCopyReferralLink() {
  const copyButton = document.querySelector('.profile_refferal-link-copy');
  const referralLink = document.querySelector('.profile_refferal-link');
  const linkWrapper = document.querySelector('.profile_refferal-link-wrapper');
  
  if (!copyButton || !referralLink || !linkWrapper) return;

  copyButton.addEventListener('click', async () => {
    const textToCopy = referralLink.textContent.trim();
    
    try {
      // Используем Clipboard API для копирования
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Failed to copy:', err);
          return;
        }
        
        document.body.removeChild(textArea);
      }
      
      // Визуальная обратная связь
      copyButton.classList.add('copied');
      
      // Создаем и показываем toast-уведомление
      showCopyToast(linkWrapper);
      
      setTimeout(() => {
        copyButton.classList.remove('copied');
      }, 200);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  });
}

// Функция для показа toast-уведомления о копировании
function showCopyToast(container) {
  // Удаляем существующий toast, если есть
  const existingToast = document.querySelector('.copy-toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Создаем элемент toast
  const toast = document.createElement('div');
  toast.className = 'copy-toast';
  toast.textContent = 'Copied!';
  
  // Добавляем toast в контейнер
  container.appendChild(toast);
  
  // Запускаем анимацию появления
  requestAnimationFrame(() => {
    toast.classList.add('copy-toast--show');
  });
  
  // Удаляем toast после анимации
  setTimeout(() => {
    toast.classList.remove('copy-toast--show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2000);
}

// Инициализация при загрузке DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initPopupManager();
    initCheckInAnimation();
    initHowItWorksAnimation();
    initFormValidation();
    initProfileProgressAnimation();
    initCopyReferralLink();
  });
} else {
  initPopupManager();
  initCheckInAnimation();
  initHowItWorksAnimation();
  initFormValidation();
  initProfileProgressAnimation();
  initCopyReferralLink();
}
