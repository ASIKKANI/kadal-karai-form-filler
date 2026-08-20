/**
 * Rotaract Club of VIT Chennai - Official Undertaking PDF Direct Engine
 * With Multi-Format Image Upload Support & Sub-Pixel Calibration
 */

// Configure PDF.js worker
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

let studentPad, parentPad;
const sigState = {
  student: { mode: 'draw', dataUrl: null },
  parent: { mode: 'draw', dataUrl: null }
};

let previewDebounceTimer = null;
let currentPdfBytes = null;
let isRendering = false;

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  // Set default dates to event date / today if empty
  const todayFormatted = getFormattedDate();
  const sDate = document.getElementById('student-date');
  const pDate = document.getElementById('parent-date');
  if (sDate && !sDate.value) sDate.value = todayFormatted;
  if (pDate && !pDate.value) pDate.value = todayFormatted;

  initSignaturePads();
  attachInputListeners();
  loadSavedDraft();
  scheduleLivePreviewUpdate(0);
});

function getFormattedDate() {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}

/**
 * Initialize Signature Canvas Pads
 */
function initSignaturePads() {
  const studentCanvas = document.getElementById('student-signature-canvas');
  const parentCanvas = document.getElementById('parent-signature-canvas');

  if (studentCanvas && window.SignaturePad) {
    studentPad = new SignaturePad(studentCanvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: '#050c30',
      minWidth: 1.5,
      maxWidth: 3.2
    });

    studentPad.addEventListener('endStroke', () => {
      if (!studentPad.isEmpty()) {
        sigState.student.dataUrl = studentPad.toDataURL('image/png');
        scheduleLivePreviewUpdate(20);
      }
    });
  }

  if (parentCanvas && window.SignaturePad) {
    parentPad = new SignaturePad(parentCanvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: '#050c30',
      minWidth: 1.5,
      maxWidth: 3.2
    });

    parentPad.addEventListener('endStroke', () => {
      if (!parentPad.isEmpty()) {
        sigState.parent.dataUrl = parentPad.toDataURL('image/png');
        scheduleLivePreviewUpdate(20);
      }
    });
  }

  resizeCanvas(studentCanvas, studentPad);
  resizeCanvas(parentCanvas, parentPad);

  window.addEventListener('resize', () => {
    resizeCanvas(studentCanvas, studentPad);
    resizeCanvas(parentCanvas, parentPad);
  });
}

function resizeCanvas(canvas, pad) {
  if (!canvas || !pad) return;
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const rect = canvas.getBoundingClientRect();
  if (rect.width > 0) {
    const data = pad.toData();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    pad.clear();
    pad.fromData(data);
  }
}

/**
 * Switch signature input modes
 */
function switchSigMode(type, mode) {
  sigState[type].mode = mode;

  // Update tab buttons
  ['draw', 'type', 'upload'].forEach(m => {
    const btn = document.getElementById(`tab-btn-${type}-${m}`);
    const pane = document.getElementById(`${type}-sig-${m}-container`);
    if (btn) btn.classList.toggle('active', m === mode);
    if (pane) {
      pane.classList.toggle('hidden', m !== mode);
      pane.classList.toggle('active', m === mode);
    }
  });

  scheduleLivePreviewUpdate(20);
}

function clearSignature(type) {
  if (type === 'student' && studentPad) {
    studentPad.clear();
  } else if (type === 'parent' && parentPad) {
    parentPad.clear();
  }
  sigState[type].dataUrl = null;
  scheduleLivePreviewUpdate(20);
}

/**
 * Robust Image Upload Processing (Converts JPG/PNG/WEBP/HEIC to clean PNG DataURL)
 */
function processUploadedImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const pngDataUrl = canvas.toDataURL('image/png');
        resolve(pngDataUrl);
      };
      img.onerror = () => {
        resolve(e.target.result);
      };
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleSigUpload(event, type) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const pngDataUrl = await processUploadedImage(file);
    sigState[type].dataUrl = pngDataUrl;
    const previewContainer = document.getElementById(`${type}-upload-preview`);
    if (previewContainer) {
      previewContainer.innerHTML = `<img src="${pngDataUrl}" alt="Uploaded Signature" />`;
      previewContainer.classList.remove('hidden');
    }
    scheduleLivePreviewUpdate(10);
  } catch (err) {
    console.error('Error uploading signature image:', err);
  }
}

/**
 * Generate Signature Image from Typed Text using Offscreen Canvas
 */
function generateTypedSignatureImage(text, fontStyle = 'cursive-1') {
  if (!text) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 90;
  const ctx = canvas.getContext('2d');
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#050c30';
  
  if (fontStyle === 'cursive-1') {
    ctx.font = 'italic 44px "Dancing Script", cursive, sans-serif';
  } else {
    ctx.font = '50px "Reenie Beanie", "Dancing Script", cursive';
  }
  
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 15, 45);
  return canvas.toDataURL('image/png');
}

/**
 * Attach listeners to update live preview instantly
 */
function attachInputListeners() {
  const inputIds = [
    'student-name', 'reg-no', 'programme-branch', 'year-sem', 'mobile-no',
    'student-date', 'parent-name', 'parent-date',
    'inp-club-name', 'inp-activity-name', 'inp-date-venue', 'inp-faculty-coord'
  ];

  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('input', () => {
      if (id === 'inp-club-name') document.getElementById('disp-club-name').textContent = el.value || 'Rotaract Club of VIT Chennai';
      if (id === 'inp-activity-name') document.getElementById('disp-activity-name').textContent = el.value || 'Kadal Karai Symphony - Episode 1, Beach Cleanup';
      if (id === 'inp-date-venue') document.getElementById('disp-date-venue').textContent = el.value || '23rd August 2026, Kovalam Beach / Chennai';
      if (id === 'inp-faculty-coord') document.getElementById('disp-faculty-coord').textContent = el.value || 'Dr. V. VIJAYALAKSHMI';

      saveDraft();
      scheduleLivePreviewUpdate(50);
    });
  });

  // Typed signatures
  const sText = document.getElementById('student-sig-text');
  const pText = document.getElementById('parent-sig-text');
  if (sText) {
    sText.addEventListener('input', () => {
      document.getElementById('student-typed-preview').textContent = sText.value || 'Your Signature';
      scheduleLivePreviewUpdate(50);
    });
  }
  if (pText) {
    pText.addEventListener('input', () => {
      document.getElementById('parent-typed-preview').textContent = pText.value || 'Parent Signature';
      scheduleLivePreviewUpdate(50);
    });
  }

  // Parent Consent Checkbox
  const consentBox = document.getElementById('parent-consent-checkbox');
  if (consentBox) {
    consentBox.addEventListener('change', () => {
      scheduleLivePreviewUpdate(20);
    });
  }
}

function scheduleLivePreviewUpdate(delayMs = 50) {
  clearTimeout(previewDebounceTimer);
  previewDebounceTimer = setTimeout(() => {
    renderPdfDocument();
  }, delayMs);
}

/**
 * Direct PDF Modification Engine via PDF-Lib with Exact Calibrated Coordinates
 */
async function buildFilledPdfDocument() {
  if (!window.TEMPLATE_PDF_BASE64 || !window.PDFLib) {
    console.error('Template or PDF-Lib not loaded');
    return null;
  }

  const { PDFDocument, rgb, StandardFonts } = PDFLib;
  const rawBytes = Uint8Array.from(atob(window.TEMPLATE_PDF_BASE64), c => c.charCodeAt(0));
  const pdfDoc = await PDFDocument.load(rawBytes);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const page2 = pages[1];

  const color = rgb(0, 0, 0);

  // Form Field Values
  const clubName = document.getElementById('inp-club-name')?.value.trim() || 'Rotaract Club of VIT Chennai';
  const activityName = document.getElementById('inp-activity-name')?.value.trim() || 'Kadal Karai Symphony - Episode 1, Beach Cleanup';
  const dateVenue = document.getElementById('inp-date-venue')?.value.trim() || '23rd August 2026, Kovalam Beach / Chennai';
  const facultyCoord = document.getElementById('inp-faculty-coord')?.value.trim() || 'Dr. V. VIJAYALAKSHMI';

  const studentName = document.getElementById('student-name')?.value.trim() || '';
  const regNo = document.getElementById('reg-no')?.value.trim().toUpperCase() || '';
  const branch = document.getElementById('programme-branch')?.value.trim() || '';
  const yearSem = document.getElementById('year-sem')?.value.trim() || '';
  const mobileNo = document.getElementById('mobile-no')?.value.trim() || '';
  const studentDate = document.getElementById('student-date')?.value.trim() || '';

  const parentName = document.getElementById('parent-name')?.value.trim() || '';
  const parentConsent = document.getElementById('parent-consent-checkbox')?.checked ?? true;
  const parentDate = document.getElementById('parent-date')?.value.trim() || '';

  // =========================================================================
  // PAGE 1: EXACT CALIBRATED COORDINATES
  // =========================================================================
  
  // 1. Name of Club/Chapter:
  if (clubName) {
    page1.drawText(clubName, { x: 200, y: 600.5, size: 10.5, font, color });
  }

  // 2. Name of Outreach Activity:
  if (activityName) {
    page1.drawText(activityName, { x: 220, y: 586.5, size: 10.5, font, color });
  }

  // 3. Date & Venue:
  if (dateVenue) {
    page1.drawText(dateVenue, { x: 155, y: 572.5, size: 9.5, font, color });
  }

  // 4. Faculty Coordinator:
  if (facultyCoord) {
    page1.drawText(facultyCoord, { x: 188, y: 559.0, size: 10.5, font, color });
  }

  // 5. STUDENT DETAILS
  // Name:
  if (studentName) {
    page1.drawText(studentName, { x: 112, y: 487.0, size: 10.5, font, color });
  }

  // Reg. No.:
  if (regNo) {
    page1.drawText(regNo, { x: 376, y: 487.0, size: 10.5, font, color });
  }

  // Programme/Branch:
  if (branch) {
    page1.drawText(branch, { x: 185, y: 473.0, size: 10.5, font, color });
  }

  // Year/Semester:
  if (yearSem) {
    page1.drawText(yearSem, { x: 408, y: 473.0, size: 10.5, font, color });
  }

  // Mobile No.:
  if (mobileNo) {
    page1.drawText(mobileNo, { x: 138, y: 459.5, size: 10.5, font, color });
  }

  // 6. UNDERTAKING: "I, _________________________, hereby undertake"
  if (studentName) {
    page1.drawText(studentName, { x: 88, y: 387.5, size: 10.5, font, color });
  }

  // =========================================================================
  // PAGE 2: EXACT CALIBRATED COORDINATES
  // =========================================================================

  // 1. Student Signature
  let studentSigData = null;
  if (sigState.student.mode === 'draw' || sigState.student.mode === 'upload') {
    studentSigData = sigState.student.dataUrl;
  } else if (sigState.student.mode === 'type') {
    const txt = document.getElementById('student-sig-text')?.value.trim() || studentName;
    if (txt) studentSigData = generateTypedSignatureImage(txt, 'cursive-1');
  }

  if (studentSigData) {
    try {
      let studentImg;
      if (studentSigData.startsWith('data:image/jpeg') || studentSigData.startsWith('data:image/jpg')) {
        studentImg = await pdfDoc.embedJpg(studentSigData);
      } else {
        studentImg = await pdfDoc.embedPng(studentSigData);
      }
      page2.drawImage(studentImg, {
        x: 175,
        y: 676,
        width: 125,
        height: 35
      });
    } catch (e) {
      console.warn('Could not embed student signature:', e);
    }
  }

  // 2. Student Date (under student signature)
  if (studentDate) {
    page2.drawText(studentDate, { x: 106, y: 661.5, size: 10.5, font, color });
  }

  // 3. Parent Consent Checkbox (YES box vs NO box)
  if (parentConsent) {
    page2.drawLine({
      start: { x: 242, y: 477 },
      end: { x: 248, y: 471 },
      thickness: 2.2,
      color: rgb(0, 0, 0)
    });
    page2.drawLine({
      start: { x: 248, y: 471 },
      end: { x: 257, y: 484 },
      thickness: 2.2,
      color: rgb(0, 0, 0)
    });
  } else {
    page2.drawLine({
      start: { x: 335, y: 477 },
      end: { x: 341, y: 471 },
      thickness: 2.2,
      color: rgb(0, 0, 0)
    });
    page2.drawLine({
      start: { x: 341, y: 471 },
      end: { x: 350, y: 484 },
      thickness: 2.2,
      color: rgb(0, 0, 0)
    });
  }

  // 4. Parent's Name (rests cleanly on line at y: 406.0)
  if (parentName) {
    page2.drawText(parentName, { x: 156, y: 406.0, size: 10.5, font, color });
  }

  // 5. Parent's Signature (rests cleanly on line at y: 370)
  let parentSigData = null;
  if (sigState.parent.mode === 'draw' || sigState.parent.mode === 'upload') {
    parentSigData = sigState.parent.dataUrl;
  } else if (sigState.parent.mode === 'type') {
    const pTxt = document.getElementById('parent-sig-text')?.value.trim() || parentName;
    if (pTxt) parentSigData = generateTypedSignatureImage(pTxt, 'cursive-2');
  }

  if (parentSigData) {
    try {
      let parentImg;
      if (parentSigData.startsWith('data:image/jpeg') || parentSigData.startsWith('data:image/jpg')) {
        parentImg = await pdfDoc.embedJpg(parentSigData);
      } else {
        parentImg = await pdfDoc.embedPng(parentSigData);
      }
      page2.drawImage(parentImg, {
        x: 175,
        y: 370,
        width: 125,
        height: 35
      });
    } catch (e) {
      console.warn('Could not embed parent signature:', e);
    }
  }

  // 6. Parent Date (rests cleanly on Date line at y: 332.5)
  if (parentDate) {
    page2.drawText(parentDate, { x: 102, y: 332.5, size: 10.5, font, color });
  }

  return await pdfDoc.save();
}

/**
 * Canvas Live Preview Engine via PDF.js
 */
async function renderPdfDocument() {
  if (isRendering) return;
  isRendering = true;

  const statusEl = document.getElementById('preview-status');
  if (statusEl) statusEl.innerHTML = `<i data-lucide="loader" class="spin"></i> Syncing...`;
  if (window.lucide) lucide.createIcons();

  try {
    const pdfBytes = await buildFilledPdfDocument();
    if (!pdfBytes) return;
    currentPdfBytes = pdfBytes;

    if (window.pdfjsLib) {
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;

      // Render Page 1
      const page1 = await pdf.getPage(1);
      await renderPageToCanvas(page1, 'pdf-preview-canvas-1');

      // Render Page 2
      const page2 = await pdf.getPage(2);
      await renderPageToCanvas(page2, 'pdf-preview-canvas-2');
    }

    if (statusEl) statusEl.innerHTML = `<i data-lucide="check-circle-2"></i> Synced`;
  } catch (err) {
    console.error('Render error:', err);
    if (statusEl) statusEl.innerHTML = `<i data-lucide="alert-circle"></i> Error`;
  } finally {
    isRendering = false;
    if (window.lucide) lucide.createIcons();
  }
}

async function renderPageToCanvas(pdfPage, canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const scale = 1.8;
  const viewport = pdfPage.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  const renderContext = {
    canvasContext: ctx,
    viewport: viewport
  };

  await pdfPage.render(renderContext).promise;
}

/**
 * Download Filled Official PDF
 */
async function handleDownloadPDF() {
  const studentName = document.getElementById('student-name')?.value.trim() || '';
  const regNo = document.getElementById('reg-no')?.value.trim() || '';

  if (!studentName || !regNo) {
    alert('Please enter your Student Full Name and Registration Number before downloading.');
    document.getElementById('student-name')?.focus();
    return;
  }

  const mainBtn = document.getElementById('main-download-btn');
  const oldText = mainBtn.innerHTML;
  mainBtn.disabled = true;
  mainBtn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> <span>Exporting Official PDF...</span>`;
  if (window.lucide) lucide.createIcons();

  try {
    const pdfBytes = await buildFilledPdfDocument();
    if (!pdfBytes) throw new Error('PDF build failed');

    const cleanReg = regNo.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const cleanName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Undertaking_${cleanReg}_${cleanName}.pdf`;

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (err) {
    console.error('Download error:', err);
    alert('Failed to download PDF. Please try again.');
  } finally {
    mainBtn.disabled = false;
    mainBtn.innerHTML = oldText;
    if (window.lucide) lucide.createIcons();
  }
}

/**
 * Toggle Event Edit inputs
 */
function toggleEventEdit() {
  const inputsDiv = document.getElementById('event-edit-inputs');
  const dispDiv = document.getElementById('event-display-grid');
  const btnText = document.getElementById('event-edit-text');

  const isHidden = inputsDiv.classList.contains('hidden');
  inputsDiv.classList.toggle('hidden', !isHidden);
  dispDiv.classList.toggle('hidden', isHidden);
  btnText.textContent = isHidden ? 'Done' : 'Edit';
}

/**
 * Toggle Mobile Preview Pane
 */
function toggleMobilePreview() {
  const previewPane = document.getElementById('preview-pane');
  const btnLabel = document.getElementById('mobile-btn-label');
  if (previewPane) {
    const isActive = previewPane.classList.toggle('mobile-active');
    if (btnLabel) {
      btnLabel.textContent = isActive ? 'Back to Form' : 'Preview PDF';
    }
  }
}

/**
 * Draft Persistence
 */
function saveDraft() {
  const draft = {
    studentName: document.getElementById('student-name')?.value || '',
    regNo: document.getElementById('reg-no')?.value || '',
    branch: document.getElementById('programme-branch')?.value || '',
    yearSem: document.getElementById('year-sem')?.value || '',
    mobileNo: document.getElementById('mobile-no')?.value || '',
    parentName: document.getElementById('parent-name')?.value || '',
    studentDate: document.getElementById('student-date')?.value || '',
    parentDate: document.getElementById('parent-date')?.value || ''
  };
  localStorage.setItem('rotaract_pdf_draft', JSON.stringify(draft));
}

function loadSavedDraft() {
  try {
    const saved = localStorage.getItem('rotaract_pdf_draft');
    if (!saved) return;
    const draft = JSON.parse(saved);
    if (draft.studentName) document.getElementById('student-name').value = draft.studentName;
    if (draft.regNo) document.getElementById('reg-no').value = draft.regNo;
    if (draft.branch) document.getElementById('programme-branch').value = draft.branch;
    if (draft.yearSem) document.getElementById('year-sem').value = draft.yearSem;
    if (draft.mobileNo) document.getElementById('mobile-no').value = draft.mobileNo;
    if (draft.parentName) document.getElementById('parent-name').value = draft.parentName;
    if (draft.studentDate) document.getElementById('student-date').value = draft.studentDate;
    if (draft.parentDate) document.getElementById('parent-date').value = draft.parentDate;
  } catch (e) {
    console.error('Error loading draft:', e);
  }
}

function resetForm() {
  if (confirm('Clear all entered details?')) {
    localStorage.removeItem('rotaract_pdf_draft');
    document.querySelectorAll('.form-pane input[type="text"], .form-pane input[type="tel"]').forEach(i => {
      if (!i.id.startsWith('inp-')) i.value = '';
    });
    clearSignature('student');
    clearSignature('parent');
    scheduleLivePreviewUpdate(20);
  }
}
