/**
 * EMO Precision Labs — Contact Form
 *
 * ① フォームIDを差し替える箇所:
 *    index.html <form action="https://formspree.io/f/YOUR_FORM_ID"> を
 *    実際の Formspree ID に書き換えてください。
 */

'use strict';

/* ============================================================
   Init: wait for DOM
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (!form) return; // guard: Three.js page might load before this
  initContactForm(form);
});

/* ============================================================
   Core
   ============================================================ */
function initContactForm(form) {

  /* ── DOM refs ── */
  const btnEl      = document.getElementById('form-submit-btn');
  const btnText    = btnEl.querySelector('.btn-text');
  const btnArrow   = btnEl.querySelector('.btn-arrow');
  const btnSpinner = btnEl.querySelector('.btn-spinner');
  const generalErr = document.getElementById('form-general-error');
  const successEl  = document.getElementById('form-success');
  const resetBtn   = document.getElementById('success-reset');

  /* Map: field key → { el, wrap, errorSpan } */
  const FIELD_KEYS = ['name', 'company', 'email', 'message'];
  const fields = {};

  FIELD_KEYS.forEach(key => {
    const wrap = form.querySelector(`[data-field="${key}"]`);
    if (!wrap) return;
    fields[key] = {
      el:        wrap.querySelector('input, textarea'),
      wrap,
      errorSpan: wrap.querySelector('.field-error'),
    };
  });

  /* ============================================================
     Validation
     ============================================================ */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validateField(key) {
    const val = fields[key]?.el.value.trim() ?? '';
    switch (key) {
      case 'name':
        if (!val) return 'お名前を入力してください';
        if (val.length < 2) return '2文字以上で入力してください';
        break;
      case 'email':
        if (!val)                   return 'メールアドレスを入力してください';
        if (!EMAIL_RE.test(val))    return 'メールアドレスの形式が正しくありません';
        break;
      case 'message':
        if (!val)           return 'お問い合わせ内容を入力してください';
        if (val.length < 10) return '10文字以上ご記入ください';
        break;
    }
    return null;
  }

  function validateAll() {
    const errors = {};
    ['name', 'email', 'message'].forEach(key => {
      const err = validateField(key);
      if (err) errors[key] = err;
    });
    return errors;
  }

  /* ============================================================
     Error / Clear UI helpers
     ============================================================ */
  function showFieldError(key, message) {
    const { wrap, errorSpan } = fields[key];
    wrap.classList.add('has-error');
    errorSpan.textContent = message;

    /* shake */
    gsap.killTweensOf(wrap);
    gsap.to(wrap, {
      x: -7, duration: 0.06, yoyo: true, repeat: 5,
      ease: 'power2.inOut',
      onComplete: () => gsap.set(wrap, { clearProps: 'x' }),
    });

    /* error text slide in */
    gsap.fromTo(errorSpan,
      { y: -5, opacity: 0 },
      { y: 0,  opacity: 1, duration: 0.28, ease: 'power2.out' }
    );
  }

  function clearFieldError(key) {
    const { wrap, errorSpan } = fields[key] ?? {};
    if (!wrap || !wrap.classList.contains('has-error')) return;
    wrap.classList.remove('has-error');
    gsap.to(errorSpan, {
      y: -4, opacity: 0, duration: 0.18, ease: 'power2.in',
      onComplete: () => { errorSpan.textContent = ''; },
    });
  }

  function clearAllErrors() {
    FIELD_KEYS.forEach(clearFieldError);
    generalErr.textContent = '';
    generalErr.classList.remove('visible');
  }

  function showGeneralError(msg) {
    generalErr.textContent = msg;
    generalErr.classList.add('visible');
    gsap.fromTo(generalErr,
      { y: -5, opacity: 0 },
      { y: 0,  opacity: 1, duration: 0.3, ease: 'power2.out' }
    );
  }

  /* ============================================================
     Button state
     ============================================================ */
  function setLoading(loading) {
    btnEl.disabled = loading;
    btnEl.classList.toggle('sending', loading);
    /* aria feedback */
    if (loading) {
      btnEl.setAttribute('aria-busy', 'true');
      btnText.setAttribute('aria-hidden', 'true');
    } else {
      btnEl.removeAttribute('aria-busy');
      btnText.removeAttribute('aria-hidden');
    }
  }

  /* ============================================================
     Submit handler
     ============================================================ */
  async function handleSubmit(e) {
    e.preventDefault();
    clearAllErrors();

    /* 1. JS validation */
    const errors = validateAll();
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([key, msg]) => showFieldError(key, msg));
      fields[Object.keys(errors)[0]].el.focus();
      return;
    }

    /* 2. Honeypot check — bot guard */
    const honeypot = form.querySelector('[name="_gotcha"]');
    if (honeypot && honeypot.value) return; // bot detected; silent exit

    setLoading(true);

    /* 3. Fetch to Formspree */
    try {
      const res = await fetch(form.action, {
        method:  'POST',
        body:    new FormData(form),
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        showSuccess();
      } else {
        const json = await res.json().catch(() => ({}));
        const msg  = Array.isArray(json?.errors)
          ? json.errors.map(err => err.message).join(' / ')
          : 'エラーが発生しました。しばらくしてから再度お試しください。';
        showGeneralError(msg);
        setLoading(false);
      }
    } catch (_) {
      showGeneralError('ネットワークエラーが発生しました。接続をご確認ください。');
      setLoading(false);
    }
  }

  /* ============================================================
     Success: Phase 1 — form exits, then success enters
     ============================================================ */
  function showSuccess() {
    /* Fire WebGL reaction immediately */
    document.dispatchEvent(new CustomEvent('emo:form-success'));

    const formRows = [
      ...form.querySelectorAll('.form-field'),
      form.querySelector('.form-actions'),
    ];

    /* Stagger form rows out (sharp power4.in — precision feel) */
    gsap.to(formRows, {
      y: -32,
      opacity: 0,
      duration: 0.44,
      stagger: { each: 0.055, from: 'end' }, // bottom-up exit
      ease: 'power4.in',
      onComplete() {
        /* Hide form from interaction & screen readers */
        gsap.set(form, { visibility: 'hidden', pointerEvents: 'none' });
        /* Reset row positions so they're clean for potential re-entry */
        gsap.set(formRows, { y: 0, opacity: 1 });
        _animateSuccessIn();
      },
    });
  }

  /* Phase 2 — success panel animates in with SVG draw */
  function _animateSuccessIn() {
    const icon   = successEl.querySelector('.success-icon');
    const circle = successEl.querySelector('.si-circle');
    const hLine  = successEl.querySelector('.si-h');
    const vLine  = successEl.querySelector('.si-v');
    const check  = successEl.querySelector('.si-check');
    const title  = successEl.querySelector('.success-title');
    const msg    = successEl.querySelector('.success-msg');
    const reset  = successEl.querySelector('.success-reset');

    /* Measure stroke lengths and prime dashoffset */
    _prepareDraw(circle, 2 * Math.PI * 34);
    _prepareDraw(hLine,  hLine.getTotalLength ? hLine.getTotalLength() : 36);
    _prepareDraw(vLine,  vLine.getTotalLength ? vLine.getTotalLength() : 36);
    _prepareDraw(check,  check.getTotalLength ? check.getTotalLength() : 52);

    /* Make visible before GSAP touches opacity */
    gsap.set(successEl, {
      visibility:    'visible',
      opacity:       0,
      y:             36,
      pointerEvents: 'none',
    });
    /* Reset child positions */
    gsap.set([icon, title, msg, reset], { opacity: 0, y: 0, scale: 1 });

    const tl = gsap.timeline();

    /* ── Panel slides up and fades in ── */
    tl.to(successEl, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power4.out',
      onStart: () => gsap.set(successEl, { pointerEvents: 'auto' }),
    })

    /* ── Icon bounces in ── */
    .fromTo(icon,
      { scale: 0.55, opacity: 0 },
      { scale: 1,    opacity: 1, duration: 0.68, ease: 'back.out(1.9)' },
      '-=0.5'
    )

    /* ── Outer ring draws in ── */
    .to(circle, {
      strokeDashoffset: 0,
      duration: 1.0,
      ease: 'power2.inOut',
    }, '-=0.45')

    /* ── Crosshair lines extend from center ── */
    // .to(hLine, { strokeDashoffset: 0, duration: 0.36, ease: 'power4.out' }, '-=0.72')
    // .to(vLine, { strokeDashoffset: 0, duration: 0.36, ease: 'power4.out' }, '-=0.62')

    /* ── Checkmark draws ── */
    .to(check, { strokeDashoffset: 0, duration: 0.52, ease: 'power2.out' }, '-=0.3')

    /* ── Text: sharp slide-up stagger ── */
    .fromTo(title,
      { y: 26, opacity: 0 },
      { y: 0,  opacity: 1, duration: 0.6, ease: 'power4.out' },
      '-=0.18'
    )
    .fromTo(msg,
      { y: 18, opacity: 0 },
      { y: 0,  opacity: 1, duration: 0.55, ease: 'power4.out' },
      '-=0.44'
    )
    .fromTo(reset,
      { y: 12, opacity: 0 },
      { y: 0,  opacity: 1, duration: 0.48, ease: 'power4.out' },
      '-=0.36'
    );
  }

  /* Prime an SVG element for stroke draw animation */
  function _prepareDraw(el, len) {
    el.style.strokeDasharray  = len;
    el.style.strokeDashoffset = len;
  }

  /* ============================================================
     Reset — new inquiry: success exits, form re-enters
     ============================================================ */
  function handleReset() {
    const formRows = [
      ...form.querySelectorAll('.form-field'),
      form.querySelector('.form-actions'),
    ];

    /* Pre-position form rows for entry (still visibility:hidden) */
    gsap.set(form,     { visibility: 'visible', opacity: 0, y: 32, pointerEvents: 'none' });
    gsap.set(formRows, { opacity: 1, y: 0 });

    const tl = gsap.timeline();

    /* ── Success slides up and out ── */
    tl.to(successEl, {
      opacity: 0,
      y: -36,
      duration: 0.42,
      ease: 'power4.in',
      onComplete() {
        /* Reset success panel for next submission */
        gsap.set(successEl, {
          visibility:    'hidden',
          pointerEvents: 'none',
          y:             36,
          opacity:       0,
        });
        /* Restore SVG dash states */
        ['.si-circle', '.si-h', '.si-v', '.si-check'].forEach(sel => {
          const svgEl = successEl.querySelector(sel);
          if (svgEl) svgEl.style.strokeDashoffset = svgEl.style.strokeDasharray;
        });
      },
    })

    /* ── Form fades and slides back in (staggered from top) ── */
    .to(form, {
      opacity: 1,
      y: 0,
      duration: 0.62,
      ease: 'power4.out',
      onStart: () => gsap.set(form, { pointerEvents: 'auto' }),
    }, '-=0.12');

    /* Housekeeping */
    form.reset();
    clearAllErrors();
    setLoading(false);
  }

  /* ============================================================
     Real-time UX: clear errors on input / validate on blur
     ============================================================ */
  FIELD_KEYS.forEach(key => {
    const f = fields[key];
    if (!f) return;

    /* Clear error as soon as user starts typing */
    f.el.addEventListener('input', () => clearFieldError(key));

    /* Validate on blur (only if field has a value — avoids nag on empty tab-through) */
    f.el.addEventListener('blur', () => {
      if (f.el.value.trim()) {
        const err = validateField(key);
        if (err) showFieldError(key, err);
        else     clearFieldError(key);
      }
    });
  });

  /* ============================================================
     Event Bindings
     ============================================================ */
  form.addEventListener('submit', handleSubmit);
  resetBtn.addEventListener('click', handleReset);
}
