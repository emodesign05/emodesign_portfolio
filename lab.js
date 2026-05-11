// lab.js — EMODESIGN LAB page animations
// GSAP + ScrollTrigger を使ったスクロール入場アニメーション

(function () {
    'use strict';

    function initLabAnimations() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

        // ── Hero アニメーション ────────────────────────────────
        const heroTl = gsap.timeline({ delay: 0.4 });

        heroTl
            .from('.lab-hero__eyebrow', {
                opacity: 0, y: 16, duration: 0.7, ease: 'power2.out'
            })
            .from('.lab-hero__title', {
                opacity: 0, y: 40, duration: 1, ease: 'power3.out'
            }, '-=0.4')
            .from('.lab-hero__sub', {
                opacity: 0, y: 16, duration: 0.6, ease: 'power2.out'
            }, '-=0.6')
            .from('.lab-hero__desc', {
                opacity: 0, y: 16, duration: 0.6, ease: 'power2.out'
            }, '-=0.4')
            .from('.lab-hero__cat-link', {
                opacity: 0, y: 10, duration: 0.5, stagger: 0.1, ease: 'power2.out'
            }, '-=0.3');

        // ── Featured カード ───────────────────────────────────
        gsap.from('.lab-featured-card', {
            scrollTrigger: {
                trigger: '.lab-featured-section',
                start: 'top 80%',
            },
            opacity: 0,
            y: 48,
            duration: 0.9,
            ease: 'power3.out'
        });

        gsap.from('.lab-featured-visual__ring', {
            scrollTrigger: {
                trigger: '.lab-featured-section',
                start: 'top 70%',
            },
            opacity: 0,
            scale: 0.6,
            duration: 1,
            stagger: 0.2,
            ease: 'power2.out'
        });

        // ── セクションヘッダー ─────────────────────────────────
        document.querySelectorAll('.lab-category-section').forEach(function (section) {
            const header = section.querySelector('.lab-section-header');
            const number = section.querySelector('.lab-section-number');
            const titleGroup = section.querySelector('.lab-section-header__text');

            if (!header) return;

            gsap.from(number, {
                scrollTrigger: { trigger: header, start: 'top 85%' },
                opacity: 0, x: -24, duration: 0.8, ease: 'power2.out'
            });

            gsap.from(titleGroup, {
                scrollTrigger: { trigger: header, start: 'top 85%' },
                opacity: 0, x: 16, duration: 0.8, ease: 'power2.out', delay: 0.1
            });

            gsap.from(section.querySelector('.lab-section-line'), {
                scrollTrigger: { trigger: header, start: 'top 85%' },
                scaleX: 0,
                transformOrigin: 'left center',
                duration: 0.7,
                ease: 'power2.out',
                delay: 0.3
            });
        });

        // ── カード スタガー入場 ────────────────────────────────
        document.querySelectorAll('.lab-grid').forEach(function (grid) {
            const cards = grid.querySelectorAll('.lab-card');
            if (!cards.length) return;

            gsap.from(cards, {
                scrollTrigger: {
                    trigger: grid,
                    start: 'top 82%',
                },
                opacity: 0,
                y: 40,
                duration: 0.75,
                stagger: 0.12,
                ease: 'power2.out'
            });
        });
    }

    // DOMContentLoaded 後に実行（script.js の GSAP 登録を待つ）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLabAnimations);
    } else {
        initLabAnimations();
    }

})();
