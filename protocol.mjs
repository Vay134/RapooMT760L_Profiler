export const VENDOR = 0x24ae;
export const PRODUCT = 0x1870;

// Captured from A HUB downloading the user's New default profile on 2026-09-27.
// ponytail: replay this verified profile only; add editing after decoding and testing reads.
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

export function makeReport(index) {
    if (!Number.isInteger(index) || index < 0 || index >= PROFILE.length) {
        throw new Error('Unknown profile command.');
    }
    const [address, bytes] = PROFILE[index];
    const report = new Uint8Array(31);
    report.set([0xa5, 0xa5, bytes.length, address & 255, address >> 8, 0, 0]);
    report.set(bytes, 7);
    return report;
}
