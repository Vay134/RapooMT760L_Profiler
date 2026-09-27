import { VENDOR, PRODUCT, PRESET, ACTIONS, BUTTONS, requireRapoo, validateProfile, compileProfile, makeReport } from './protocol.mjs';

const $ = selector => document.querySelector(selector);
const connect = $('#connect');
const apply = $('#apply');
const status = $('#status');
const progress = $('#progress');
let receiver;
let busy = false;
let lines = [];
const record = text => {
    lines.push(text);
    lines = lines.slice(-40);
    $('#log').textContent = lines.join('\n');
};

BUTTONS.forEach((text, i) => {
    const label = document.createElement('label');
    label.textContent = text;
    const select = document.createElement('select');
    select.id = `button-${i}`;
    Object.entries(ACTIONS).forEach(([key, action]) => select.add(new Option(action.label, key)));
    label.append(select);
    $('#buttons').append(label);
});

function showProfile(value) {
    const profile = validateProfile(value);
    $('#name').value = profile.name;
    $('#dpi').value = profile.dpi;
    $('#rate').value = profile.pollingRate;
    profile.buttons.forEach((action, i) => { $(`#button-${i}`).value = action; });
    $('#vertical').checked = profile.verticalReversed;
    $('#horizontal').checked = profile.horizontalReversed;
}

function editorProfile() {
    return validateProfile({
        format: PRESET.format, version: 1, name: $('#name').value,
        dpi: Number($('#dpi').value), pollingRate: Number($('#rate').value),
        buttons: BUTTONS.map((_, i) => $(`#button-${i}`).value),
        verticalReversed: $('#vertical').checked, horizontalReversed: $('#horizontal').checked,
    });
}

function setBusy(value) {
    busy = value;
    connect.disabled = value || !navigator.hid;
    apply.disabled = value || !receiver?.opened;
    $('#fields').disabled = value;
    ['#preset', '#name', '#download', '#import', '#file'].forEach(id => { $(id).disabled = value; });
}

showProfile(PRESET);
$('#preset').onclick = () => { showProfile(PRESET); status.textContent = 'Default profile loaded into the editor.'; };
$('#import').onclick = () => $('#file').click();
$('#file').onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
        if (file.size > 65536) throw new Error('Profile files must be smaller than 64 KB.');
        const value = JSON.parse(await file.text());
        if (busy) throw new Error('Wait for the current transfer to finish.');
        showProfile(value);
        status.textContent = 'Profile imported. Apply to send it to the mouse.';
    } catch (error) { status.textContent = `Import failed: ${error.message}`; }
    finally { event.target.value = ''; }
};
$('#download').onclick = () => {
    try {
        const profile = editorProfile();
        const url = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 4) + '\n'], {type: 'application/json'}));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${profile.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'profile'}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        status.textContent = 'Profile exported.';
    } catch (error) { status.textContent = error.message; }
};

async function queryStatus() {
    // A HUB status query; a supported receiver returns current DPI in report BB.
    const query = new Uint8Array(31);
    query[0] = 0xb0;
    try { requireRapoo(receiver); await receiver.sendReport(0xba, query); }
    catch (error) { record(`Status query: ${error.message}`); }
}

if (!navigator.hid) {
    connect.disabled = true;
    status.textContent = 'Use desktop Chrome or Edge with device access enabled.';
}
connect.onclick = async () => {
    if (busy) return;
    setBusy(true);
    try {
        if (receiver?.opened) await receiver.close();
        receiver = undefined;
        let selected = (await navigator.hid.getDevices()).filter(d => d.vendorId === VENDOR && d.productId === PRODUCT && d.collections.some(c => c.usagePage === 0xff00 && c.usage === 14));
        if (selected.length !== 1) selected = await navigator.hid.requestDevice({filters: [{vendorId: VENDOR, productId: PRODUCT, usagePage: 0xff00, usage: 14}]});
        if (selected.length !== 1) throw new Error('Choose the Rapoo receiver in the connection window.');
        receiver = requireRapoo(selected[0]);
        await receiver.open();
        receiver.oninputreport = event => {
            const data = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
            if (event.reportId === 0xbb && data.length >= 6 && data[0] === 0xb0) {
                const dpi = data[2] | data[3] << 8;
                if (dpi >= 50 && dpi <= 4000) $('#live').textContent = `Last reported mouse DPI: ${dpi}. Editor values remain from the selected profile; button and polling-rate readback is unavailable.`;
            }
        };
        $('#device').textContent = 'Rapoo · 2.4 GHz · Connected';
        $('#live').textContent = 'Displayed settings are from the selected profile. Full device readback is unavailable in this browser.';
        record('Connected to Rapoo 24AE:1870.');
        status.textContent = 'Connected. Apply sends the displayed settings to the mouse.';
        await queryStatus();
    } catch (error) {
        $('#device').textContent = 'Rapoo · 2.4 GHz · Disconnected';
        status.textContent = error.message;
        record(`Connection failed: ${error.message}`);
    } finally { setBusy(false); }
};
$('#editor').onsubmit = async event => {
    event.preventDefault();
    if (busy) return;
    let profile, blocks;
    try { profile = editorProfile(); blocks = compileProfile(profile); }
    catch (error) { status.textContent = error.message; return; }
    setBusy(true);
    progress.hidden = false;
    progress.value = 0;
    try {
        for (let i = 0; i < blocks.length; i++) {
            requireRapoo(receiver);
            if (!receiver.opened) throw new Error('Receiver disconnected. Reconnect and apply again.');
            status.textContent = `Sending profile (${i + 1} of ${blocks.length})…`;
            await receiver.sendReport(0xba, makeReport(i, blocks));
            progress.value = i + 1;
            await new Promise(resolve => setTimeout(resolve, 275));
        }
        status.textContent = 'Profile sent. Test the mouse to confirm the settings.';
        record(`Sent profile: ${profile.name}, ${profile.dpi} DPI, ${1000 / profile.pollingRate} Hz.`);
        $('#live').textContent = 'Profile sent. Waiting for mouse DPI status; full settings readback is unavailable.';
        await queryStatus();
    } catch (error) { status.textContent = `Apply stopped: ${error.message}`; record(status.textContent); }
    finally { setBusy(false); }
};
navigator.hid?.addEventListener('disconnect', event => {
    if (event.device !== receiver) return;
    apply.disabled = true;
    $('#device').textContent = 'Rapoo · 2.4 GHz · Disconnected';
    $('#live').textContent = 'Displayed settings are from the selected profile.';
    status.textContent = 'Receiver disconnected. Reconnect to apply a profile.';
});
