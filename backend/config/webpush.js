const webpush = require('web-push');

function init() {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@qreturn.app';

    if (!vapidPublicKey || !vapidPrivateKey) {
        console.warn('⚠️ VAPID keys not set. Web Push will not work. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env');
        return false;
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    return true;
}

const ready = init();

async function sendPush(subscription, payload) {
    if (!ready) return false;
    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload), {
            TTL: 86400,
        });
        return true;
    } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
            return { expired: true };
        }
        console.error('Web Push send error:', err.message);
        return false;
    }
}

module.exports = { webpush, sendPush, vapidPublicKey: process.env.VAPID_PUBLIC_KEY };
