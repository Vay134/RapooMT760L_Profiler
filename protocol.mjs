export const VENDOR = 0x24ae;
export const PRODUCT = 0x1870;

// Captured from A HUB downloading the user's New default profile on 2026-09-27.
// The captured blocks preserve settings outside the editable fields.
export const PROFILE = [
    [0x638, [20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3]],
    [0x630, [1, 1, 255, 255]],
    [0x600, [3, 0, 1, 0]],
    [0x604, [3, 0, 4, 0]],
    [0x608, [3, 0, 2, 0]],
    [0x614, [4, 0, 0, 205]],
    [0x618, [4, 0, 0, 181]],
    [0x610, [2, 0, 1, 6]],
    [0x60c, [2, 0, 8, 15]],
    [0x624, [11, 0, 1, 0]],
    [0x628, [11, 0, 2, 0]],
    [0x61c, [12, 0, 1, 255]],
    [0x620, [12, 0, 2, 255]],
];

export function requireRapoo(device) {
    const report = device?.collections?.find(c => c.usagePage === 0xff00 && c.usage === 14)
        ?.outputReports?.find(r => r.reportId === 0xba);
    const bits = report?.items?.reduce((n, item) => n + item.reportSize * item.reportCount, 0);
    if (device?.vendorId !== VENDOR || device?.productId !== PRODUCT || bits !== 248) {
        throw new Error('This receiver is not the supported Rapoo MT760 receiver.');
    }
    return device;
}

import { KEYS } from './keys.mjs?v=20260928-1';
export { KEYS };

export const ACTIONS = {
    left: {label: 'Left click', bytes: [3, 0, 1, 0]},
    right: {label: 'Right click', bytes: [3, 0, 2, 0]},
    middle: {label: 'Middle click', bytes: [3, 0, 4, 0]},
    playPause: {label: 'Play / pause', bytes: [4, 0, 0, 205]},
    next: {label: 'Next track', bytes: [4, 0, 0, 181]},
    copy: {label: 'Copy (Ctrl+C)', bytes: [2, 0, 1, 6]},
    lock: {label: 'Lock Windows (Win+L)', bytes: [2, 0, 8, 15]},
    "media:181": {"label": "Next track", "group": "Media / system", "bytes": [4, 0, 0, 181]},
    "media:182": {"label": "Prev track", "group": "Media / system", "bytes": [4, 0, 0, 182]},
    "media:183": {"label": "Stop", "group": "Media / system", "bytes": [4, 0, 0, 183]},
    "media:205": {"label": "Play/Pause", "group": "Media / system", "bytes": [4, 0, 0, 205]},
    "media:226": {"label": "Mute", "group": "Media / system", "bytes": [4, 0, 0, 226]},
    "media:233": {"label": "Volume+", "group": "Media / system", "bytes": [4, 0, 0, 233]},
    "media:234": {"label": "Volume-", "group": "Media / system", "bytes": [4, 0, 0, 234]},
    "media:402": {"label": "Calculator", "group": "Media / system", "bytes": [4, 0, 1, 146]},
    "media:394": {"label": "Mail", "group": "Media / system", "bytes": [4, 0, 1, 138]},
    "media:547": {"label": "Homepage", "group": "Media / system", "bytes": [4, 0, 2, 35]},
    "media:548": {"label": "Back", "group": "Media / system", "bytes": [4, 0, 2, 36]},
    "media:549": {"label": "Forward", "group": "Media / system", "bytes": [4, 0, 2, 37]},
    "media:551": {"label": "Refresh", "group": "Media / system", "bytes": [4, 0, 2, 39]},
    "media:550": {"label": "Stop", "group": "Media / system", "bytes": [4, 0, 2, 38]},
    "media:545": {"label": "Search", "group": "Media / system", "bytes": [4, 0, 2, 33]},
    "media:554": {"label": "Favorites", "group": "Media / system", "bytes": [4, 0, 2, 42]},
    "media:404": {"label": "My computer", "group": "Media / system", "bytes": [4, 0, 1, 148]},
    "media:387": {"label": "Media", "group": "Media / system", "bytes": [4, 0, 1, 131]},
    "media:111": {"label": "Bright +", "group": "Media / system", "bytes": [4, 0, 0, 111]},
    "media:112": {"label": "Bright -", "group": "Media / system", "bytes": [4, 0, 0, 112]},
    "media:671": {"label": "Desktop", "group": "Media / system", "bytes": [4, 0, 2, 159]},
    "media:672": {"label": "Launchpad", "group": "Media / system", "bytes": [4, 0, 2, 160]},
    "shortcut:4:61": {"label": "Close window", "group": "Shortcuts", "bytes": [2, 0, 4, 61]},
    "shortcut:8:15": {"label": "Lock computer", "group": "Shortcuts", "bytes": [2, 0, 8, 15]},
    "shortcut:8:21": {"label": "Run", "group": "Shortcuts", "bytes": [2, 0, 8, 21]},
    "shortcut:8:7": {"label": "Show desktop", "group": "Shortcuts", "bytes": [2, 0, 8, 7]},
    "shortcut:8:87": {"label": "Zoom in", "group": "Shortcuts", "bytes": [2, 0, 8, 87]},
    "shortcut:8:45": {"label": "Zoom out", "group": "Shortcuts", "bytes": [2, 0, 8, 45]},
    "shortcut:1:6": {"label": "Copy", "group": "Shortcuts", "bytes": [2, 0, 1, 6]},
    "shortcut:1:25": {"label": "Paste", "group": "Shortcuts", "bytes": [2, 0, 1, 25]},
    "shortcut:1:27": {"label": "Cut", "group": "Shortcuts", "bytes": [2, 0, 1, 27]},
    "shortcut:1:4": {"label": "Select all", "group": "Shortcuts", "bytes": [2, 0, 1, 4]},

};
for (const [code, label] of KEYS) {
    ACTIONS[`key:${code}`] = {label, group: 'Keyboard', bytes: [1, 0, code, 0]};
}
export const BUTTONS = ['Left button', 'Right button', 'Wheel click', 'Top button', 'Bottom button', 'Side button (up)', 'Side button (down)', 'Wheel up', 'Wheel down', 'Wheel left', 'Wheel right'];
Object.assign(ACTIONS, {
    scrollUp: {label: 'Scroll up', group: 'Mouse', bytes: [11, 0, 1, 0]},
    scrollDown: {label: 'Scroll down', group: 'Mouse', bytes: [11, 0, 2, 0]},
    scrollLeft: {label: 'Scroll left', group: 'Mouse', bytes: [12, 0, 1, 255]},
    scrollRight: {label: 'Scroll right', group: 'Mouse', bytes: [12, 0, 2, 255]},
    back: {label: 'Back', group: 'Mouse', bytes: [3, 0, 8, 0]},
    forward: {label: 'Forward', group: 'Mouse', bytes: [3, 0, 16, 0]},
    disabled: {label: 'Disable', group: 'Mouse', bytes: [7, 0, 0, 0]},
    dpiDown: {label: 'DPI decrease', group: 'Mouse', bytes: [8, 0, 6, 0]},
    dpiCycle: {label: 'Cycle DPI forward', group: 'Mouse', bytes: [8, 0, 3, 0]},
    dpiCycleBack: {label: 'Cycle DPI backward', group: 'Mouse', bytes: [8, 0, 4, 0]},
    fire: {label: 'Fire button', group: 'Mouse', bytes: [3, 0, 1, 1]},
    configCycle: {label: 'Cycle configuration', group: 'Mouse', bytes: [10, 0, 2, 0]},
    dpiUp: {label: 'DPI increase', group: 'Mouse', bytes: [8, 0, 5, 0]},
    sniper: {label: 'Sniper', group: 'Mouse', bytes: [9, 0, 1, 0]},
});
export const PRESET = Object.freeze({
    format: 'rapoo-mt760l-profile', version: 2, name: 'New default',
    dpi: 1000, dpiLevels: Object.freeze([1000]), activeDpi: 0, pollingRate: 1,
    buttons: Object.freeze(['left', 'right', 'middle', 'copy', 'lock', 'playPause', 'next', 'scrollUp', 'scrollDown', 'scrollLeft', 'scrollRight']),
});

export function actionBytes(action) {
    if (typeof action !== 'string') throw new Error('Unsupported button mapping.');
    if (Object.hasOwn(ACTIONS, action)) return [...ACTIONS[action].bytes];
    const match = /^shortcut:(1|2|4|8|16|32|64|128):(\d{1,3})$/.exec(action);
    if (match && KEYS.some(([code]) => code === Number(match[2]) && code < 224)) return [2, 0, Number(match[1]), Number(match[2])];
    throw new Error('Unsupported button mapping.');
}

export function validateProfile(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.format !== PRESET.format || ![1, 2].includes(value.version)) {
        throw new Error('Choose a profile exported by this MT760L app.');
    }
    if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 60) throw new Error('Profile name must contain 1-60 characters.');
    if (!Number.isInteger(value.dpi) || value.dpi < 50 || value.dpi > 4000 || value.dpi % 50) throw new Error('DPI must be 50-4000 in steps of 50.');
    const dpiLevels = value.version === 1 ? [value.dpi] : value.dpiLevels;
    const activeDpi = value.version === 1 ? 0 : value.activeDpi;
    if (!Array.isArray(dpiLevels) || dpiLevels.length < 1 || dpiLevels.length > 7 || dpiLevels.some(d => !Number.isInteger(d) || d < 50 || d > 4000 || d % 50)) throw new Error('Set 1-7 DPI levels, each 50-4000 in steps of 50.');
    if (!Number.isInteger(activeDpi) || activeDpi < 0 || activeDpi >= dpiLevels.length || value.dpi !== dpiLevels[activeDpi]) throw new Error('Choose a valid active DPI level.');
    if (!Number.isInteger(value.pollingRate) || ![1, 2, 4, 8].includes(value.pollingRate)) throw new Error('Unsupported polling rate.');
    if (!Array.isArray(value.buttons) || value.buttons.length !== (value.version === 1 ? 7 : 11)) throw new Error('Unsupported button mapping.');
    let buttons = [...value.buttons];
    if (value.version === 1) {
        if (typeof value.verticalReversed !== 'boolean' || typeof value.horizontalReversed !== 'boolean') throw new Error('Invalid scroll direction.');
        buttons = [0, 2, 1, 4, 3, 5, 6].map(i => value.buttons[i] === 'right' ? 'middle' : value.buttons[i] === 'middle' ? 'right' : value.buttons[i]);
        buttons.push(...(value.verticalReversed ? ['scrollDown', 'scrollUp'] : ['scrollUp', 'scrollDown']), ...(value.horizontalReversed ? ['scrollRight', 'scrollLeft'] : ['scrollLeft', 'scrollRight']));
    }
    const aliases = {'media:181': 'next', 'media:205': 'playPause', 'shortcut:8:15': 'lock', 'shortcut:1:6': 'copy'};
    buttons = buttons.map(a => Object.hasOwn(aliases, a) ? aliases[a] : a);
    buttons.forEach(actionBytes);
    if (!buttons.slice(0, 7).includes('left')) throw new Error('Keep at least one button assigned to left click.');
    return {format: PRESET.format, version: 2, name: value.name.trim(), dpi: value.dpi, dpiLevels: [...dpiLevels], activeDpi, pollingRate: value.pollingRate, buttons};
}

export function compileProfile(value) {
    const p = validateProfile(value);
    const blocks = PROFILE.map(([address, bytes]) => [address, [...bytes]]);
    // A HUB encoder: seven little-endian DPI/50 values, level count minus one at 14,
    // active index at 16. Preserve the captured flags at 17-19.
    blocks[0][1].fill(0, 0, 17);
    p.dpiLevels.forEach((dpi, i) => {
        blocks[0][1][i * 2] = dpi / 50;
        blocks[0][1][i * 2 + 1] = 0;
    });
    blocks[0][1][14] = p.dpiLevels.length - 1;
    blocks[0][1][16] = p.activeDpi;
    blocks[1][1][0] = p.pollingRate;
    blocks[1][1][1] = p.pollingRate;
    const indexes = [2, 4, 3, 7, 8, 5, 6, 9, 10, 11, 12];
    p.buttons.forEach((action, i) => { blocks[indexes[i]][1] = actionBytes(action); });
    return blocks;
}

export function makeReport(index, blocks = PROFILE) {
    if (!Number.isInteger(index) || index < 0 || index >= PROFILE.length) throw new Error('Unknown profile command.');
    const [address, bytes] = blocks[index];
    if (address !== PROFILE[index][0] || bytes.length !== PROFILE[index][1].length || bytes.some(b => !Number.isInteger(b) || b < 0 || b > 255)) throw new Error('Invalid profile command.');
    const report = new Uint8Array(31);
    report.set([0xa5, 0xa5, bytes.length, address & 255, address >> 8, 0, 0]);
    report.set(bytes, 7);
    return report;
}
