document.addEventListener('DOMContentLoaded', () => {
    const autoVideos = document.querySelectorAll('.work-item .auto-video');

    // 画面にどれくらい見えたら再生・停止するか設定
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.2 // 画面内に20%以上入ったら再生
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;

            if (entry.isIntersecting) {
                // 画面内に入ったら再生
                video.play().catch(() => {
                    // 自動再生がブロックされた場合のフォールバック（無視してOK）
                });
            } else {
                // 画面外に出たら一時停止（PC/スマホの負担を軽減）
                video.pause();
            }
        });
    }, observerOptions);

    autoVideos.forEach(video => {
        observer.observe(video);
    });
});