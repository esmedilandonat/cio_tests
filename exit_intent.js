// Vanilla JS Exit Intent Detection Library
const PAGE_VIEW_STORAGE_KEY = 'exit-intent-page-views';

function getPageViews(key = PAGE_VIEW_STORAGE_KEY) {
    try {
        const raw = localStorage.getItem(key);
        const n = parseInt(raw, 10);
        return isNaN(n) ? 0 : n;
    } catch (e) { return 0; }
}

function setPageViews(count, key = PAGE_VIEW_STORAGE_KEY) {
    try { localStorage.setItem(key, String(count)); } catch (_) { }
}

function incrementPageViews(amount = 1, key = PAGE_VIEW_STORAGE_KEY) {
    const updated = getPageViews(key) + amount;
    setPageViews(updated, key);
    return updated;
}
incrementPageViews();

function isMobileDevice(mobileBreakpoint = 768) {
    return window.innerWidth <= mobileBreakpoint;
}

function getScrollThreshold(scrollUpThreshold, mobileBreakpoint = 768) {
    if (typeof scrollUpThreshold === 'number') return scrollUpThreshold;
    if (typeof scrollUpThreshold === 'object' && scrollUpThreshold !== null) {
        const isMobile = isMobileDevice(mobileBreakpoint);
        return isMobile ? (scrollUpThreshold.mobile || 0) : (scrollUpThreshold.desktop || 0);
    }
    return 0;
}

function observeExitIntent(options = {}) {
    const config = {
        timeOnPage: 0, idleTime: 0, mouseLeaveDelay: 1000,
        tabChange: true, windowBlur: true, eventName: 'exit-intent',
        debug: false, pageViewsToTrigger: 5,
        scrollUpThreshold: { mobile: 200, desktop: 400 },
        mobileBreakpoint: 768, scrollUpInterval: 100, ...options
    };

    let timers = [], listeners = [], idleTimeout = null, mouseLeaveTimer = null, scrollCheckInterval = null;

    function log(message) { if (config.debug) console.log(message); }

    function destroy() {
        timers.forEach(clearTimeout); timers = [];
        listeners.forEach(({ el, type, fn }) => el.removeEventListener(type, fn)); listeners = [];
        if (idleTimeout) clearTimeout(idleTimeout);
        if (mouseLeaveTimer) clearTimeout(mouseLeaveTimer);
        if (scrollCheckInterval) clearInterval(scrollCheckInterval);
    }

    function trigger(reason) {
        log("triggered with reason: " + reason);
        const event = new CustomEvent(config.eventName, { detail: reason });
        window.dispatchEvent(event);
    }

    const currentViews = getPageViews();
    if (config.pageViewsToTrigger && currentViews >= config.pageViewsToTrigger) {
        trigger('pageViews');
    }

    if (config.timeOnPage > 0) timers.push(setTimeout(() => trigger('timeOnPage'), config.timeOnPage));

    if (config.idleTime > 0) {
        let idleTimer;
        function resetIdle() {
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(() => trigger('idleTime'), config.idleTime);
        }
        ['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach(type => {
            window.addEventListener(type, resetIdle);
            listeners.push({ el: window, type, fn: resetIdle });
        });
        resetIdle();
    }

    if (config.mouseLeaveDelay > 0) {
        function onMouseOut(e) {
            if (!e.relatedTarget && !e.toElement) mouseLeaveTimer = setTimeout(() => trigger('mouseLeave'), config.mouseLeaveDelay);
        }
        function onMouseOver() { if (mouseLeaveTimer) clearTimeout(mouseLeaveTimer); }
        window.addEventListener('mouseout', onMouseOut);
        window.addEventListener('mouseover', onMouseOver);
        listeners.push({ el: window, type: 'mouseout', fn: onMouseOut });
        listeners.push({ el: window, type: 'mouseover', fn: onMouseOver });
    }

    if (config.tabChange) {
        function onVisibility() { if (document.visibilityState === 'hidden') trigger('tabChange'); }
        document.addEventListener('visibilitychange', onVisibility);
        listeners.push({ el: document, type: 'visibilitychange', fn: onVisibility });
    }

    if (config.windowBlur) {
        function onBlur() {
            setTimeout(() => {
                const activeElement = document.activeElement;
                if (activeElement && activeElement.tagName === 'IFRAME' && document.contains(activeElement)) return;
                trigger('windowBlur');
            }, 0);
        }
        window.addEventListener('blur', onBlur);
        listeners.push({ el: window, type: 'blur', fn: onBlur });
    }

    const currentScrollThreshold = getScrollThreshold(config.scrollUpThreshold, config.mobileBreakpoint);
    if (currentScrollThreshold > 0) {
        let lastScrollY = window.scrollY;
        scrollCheckInterval = setInterval(() => {
            const currentScrollY = window.scrollY;
            if (lastScrollY - currentScrollY >= currentScrollThreshold) trigger('scrollUp');
            lastScrollY = currentScrollY;
        }, config.scrollUpInterval);
    }

    return { destroy };
}

class ExitIntentPopup {
    constructor(options = {}) {
        this.options = {
            showOnStep: 1, buttonAction: 'close', navigateToStep: null,
            identifier: 'default', buttonText: 'Get My Quotes',
            header: 'Wait! Don\'t Leave Yet!', ...options
        };
        this.popupShown = false;
        this.dialog = null;
        this.destroyExitIntent = null;
        this.init();
    }

    init() { this.createDialog(); this.setupExitIntent(); }

    createDialog() {
        const dialog = document.createElement('dialog');
        dialog.className = `dialog dialog--exit-intent dialog--exit-intent-${this.options.identifier}`;
        dialog.innerHTML = `
            <div class="dialog__background"></div>
            <div class="dialog__inner">
                <div class="dialog__wrapper">
                    <div class="dialog__container container">
                        <div class="dialog__close">✕</div>
                        <div class="dialog__header">${this.options.header}</div>
                        <div class="dialog__content">
                            <form id="exit-form">
                                <input type="text" name="name" placeholder="Your Name" required>
                                <input type="email" name="email" placeholder="Your Email" required>
                                <button type="submit">${this.options.buttonText}</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>`;

        dialog.querySelectorAll('.dialog__background, .dialog__close').forEach(el => {
            el.addEventListener('click', () => this.close());
        });

        // Handle form submission
        const form = dialog.querySelector('#exit-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = form.querySelector('[name="name"]').value;
            const email = form.querySelector('[name="email"]').value;

            // Identify user with Customer.io analytics
            if (typeof analytics !== 'undefined') {
                analytics.identify(email, { name: name, email: email });
                console.log('Exit intent form: User identified via analytics');
            }

            // Show success message and close
            alert('Thank you! We\'ll send you quotes shortly.');
            form.reset();
            this.close();
        });

        // Append to body instead of wrapper
        document.body.appendChild(dialog);
        this.dialog = dialog;
    }

    setupExitIntent() {
        const { destroy } = observeExitIntent({
            eventName: `exit-intent-${this.options.identifier}`,
            debug: true, pageViewsToTrigger: 0
        });
        this.destroyExitIntent = destroy;
        window.addEventListener(`exit-intent-${this.options.identifier}`, this.handleExitIntent.bind(this));
    }

    handleExitIntent(e) {
        // Simplified logic - no Vue.js references
        if (this.popupShown) return;

        // Optional: Push to dataLayer for analytics
        if (window.dataLayer) {
            window.dataLayer.push({
                event: 'exit-intent-triggered',
                identifier: this.options.identifier
            });
        }

        this.popupShown = true;
        this.show();
    }

    show() {
        if (this.dialog) {
            this.dialog.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    close() {
        if (this.dialog) {
            this.dialog.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    }
}
