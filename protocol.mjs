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

export const ACTIONS = {
    left: {label: 'Left click', bytes: [3, 0, 1, 0]},
    right: {label: 'Right click', bytes: [3, 0, 4, 0]},
    middle: {label: 'Middle click', bytes: [3, 0, 2, 0]},
    playPause: {label: 'Play / pause', bytes: [4, 0, 0, 205]},
    next: {label: 'Next track', bytes: [4, 0, 0, 181]},
    copy: {label: 'Copy (Ctrl+C)', bytes: [2, 0, 1, 6]},
    lock: {label: 'Lock Windows (Win+L)', bytes: [2, 0, 8, 15]},
};
export const BUTTONS = ['Left button', 'Right button', 'Wheel click', 'Top button', 'Bottom button', 'Side button (up)', 'Side button (down)'];
export const PRESET = Object.freeze({
    format: 'rapoo-mt760l-profile', version: 1, name: 'New default',
    dpi: 1000, pollingRate: 1,
    buttons: Object.freeze(['left', 'right', 'middle', 'lock', 'copy', 'playPause', 'next']),
    verticalReversed: false, horizontalReversed: false,
});

export function validateProfile(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.format !== PRESET.format || value.version !== 1) {
        throw new Error('Choose a profile exported by this MT760L app.');
    }
    if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 60) throw new Error('Profile name must contain 1–60 characters.');
    if (!Number.isInteger(value.dpi) || value.dpi < 50 || value.dpi > 4000 || value.dpi % 50) throw new Error('DPI must be 50–4000 in steps of 50.');
    if (!Number.isInteger(value.pollingRate) || ![1, 2, 4, 8].includes(value.pollingRate)) throw new Error('Unsupported polling rate.');
    if (!Array.isArray(value.buttons) || value.buttons.length !== 7 || value.buttons.some(a => !Object.hasOwn(ACTIONS, a))) throw new Error('Unsupported button mapping.');
    if (!value.buttons.includes('left')) throw new Error('Keep at least one button assigned to left click.');
    if (typeof value.verticalReversed !== 'boolean' || typeof value.horizontalReversed !== 'boolean') throw new Error('Invalid scroll direction.');
    return {format: PRESET.format, version: 1, name: value.name.trim(), dpi: value.dpi, pollingRate: value.pollingRate, buttons: [...value.buttons], verticalReversed: value.verticalReversed, horizontalReversed: value.horizontalReversed};
}

export function compileProfile(value) {
    const p = validateProfile(value);
    const blocks = PROFILE.map(([address, bytes]) => [address, [...bytes]]);
    blocks[0][1][0] = p.dpi / 50;
    blocks[1][1][0] = p.pollingRate;
    blocks[1][1][1] = p.pollingRate;
    const indexes = [2, 3, 4, 8, 7, 5, 6];
    p.buttons.forEach((action, i) => { blocks[indexes[i]][1] = [...ACTIONS[action].bytes]; });
    if (p.verticalReversed) [blocks[9][1], blocks[10][1]] = [blocks[10][1], blocks[9][1]];
    if (p.horizontalReversed) [blocks[11][1], blocks[12][1]] = [blocks[12][1], blocks[11][1]];
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
