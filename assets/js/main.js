/**
 * Unified Reader - Version 1f
 * Support: EPUB (2-page spread), PDF (dual canvas).
 */

const fileInput = document.getElementById('file-selector');
const bookListUI = document.getElementById('active-book-list');
const epubContainer = document.getElementById('epub-render-target');
const pdfLayer = document.getElementById('pdf-render-layer');
const canvasLeft = document.getElementById('pdf-canvas-left');
const canvasRight = document.getElementById('pdf-canvas-right');
const fallbackUI = document.getElementById('fallback-ui');
const displayFrame = document.getElementById('display-frame');

const fsBtn = document.getElementById('toggle-fs');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const toggleSpreadBtn = document.getElementById('toggle-spread');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');

let eReader = null;
let rendition = null;
let pdfDoc = null;
let pageNum = 1; // Current "Left Page" number
let localLibrary = [];
let currentBook = null;
let isSinglePageMode = false;
let pdfScale = 1.5; // Initial PDF zoom scale

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

window.addEventListener('DOMContentLoaded', restoreSession);

// Fullscreen Toggle
fsBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        fsBtn.textContent = "EXIT_FS";
    } else {
        document.exitFullscreen();
        fsBtn.textContent = "FULLSCREEN";
    }
});

// Page Mode Toggle
toggleSpreadBtn.addEventListener('click', () => {
    isSinglePageMode = !isSinglePageMode;
    
    if (isSinglePageMode) {
        toggleSpreadBtn.textContent = "TWO_PAGE";
        displayFrame.classList.add('single-page-mode');
        pdfLayer.classList.add('single-page');
        fallbackUI.querySelector('small').textContent = "SINGLE-PAGE MODE";
        
        // Update EPUB if loaded
        if (rendition) {
            rendition.destroy();
            renderEpub(currentBook.path);
        }
        
        // Update PDF if loaded
        if (pdfDoc) {
            drawPdfSpread();
        }
    } else {
        toggleSpreadBtn.textContent = "SINGLE_PAGE";
        displayFrame.classList.remove('single-page-mode');
        pdfLayer.classList.remove('single-page');
        fallbackUI.querySelector('small').textContent = "TWO-PAGE SPREAD ACTIVE";
        
        // Update EPUB if loaded
        if (rendition) {
            rendition.destroy();
            renderEpub(currentBook.path);
        }
        
        // Update PDF if loaded
        if (pdfDoc) {
            drawPdfSpread();
        }
    }
    
    updateLayoutStatus();
});

// EPUB font size tracking
let epubFontSize = 100; // percentage

// Zoom Controls
zoomInBtn.addEventListener('click', () => {
    if (pdfDoc) {
        pdfScale += 0.25;
        if (pdfScale > 3.0) pdfScale = 3.0;
        drawPdfSpread();
    }
    if (rendition) {
        epubFontSize += 10;
        if (epubFontSize > 200) epubFontSize = 200;
        rendition.themes.default({
            body: {
                'font-size': epubFontSize + '%'
            }
        });
    }
});

zoomOutBtn.addEventListener('click', () => {
    if (pdfDoc) {
        pdfScale -= 0.25;
        if (pdfScale < 0.5) pdfScale = 0.5;
        drawPdfSpread();
    }
    if (rendition) {
        epubFontSize -= 10;
        if (epubFontSize < 50) epubFontSize = 50;
        rendition.themes.default({
            body: {
                'font-size': epubFontSize + '%'
            }
        });
    }
});

// File Upload
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'epub') {
        // For EPUB, read as ArrayBuffer
        const reader = new FileReader();
        reader.onload = function(event) {
            const entry = { 
                title: file.name, 
                path: event.target.result, 
                format: ext 
            };
            localLibrary.push(entry);
            updateLibraryUI();
            executeLoad(entry);
        };
        reader.readAsArrayBuffer(file);
    } else {
        // For PDF, use blob URL
        const url = URL.createObjectURL(file);
        const entry = { title: file.name, path: url, format: ext };
        localLibrary.push(entry);
        updateLibraryUI();
        executeLoad(entry);
    }
});

function updateLibraryUI() {
    bookListUI.innerHTML = "";
    localLibrary.forEach(item => {
        const li = document.createElement('li');
        li.className = "list-entry";
        li.textContent = item.title;
        li.onclick = () => executeLoad(item);
        bookListUI.appendChild(li);
    });
}

function executeLoad(book) {
    killEngines();
    currentBook = book;
    recordState(book.title);
    
    if (book.format === 'epub') {
        renderEpub(book.path);
    } else if (book.format === 'pdf') {
        renderPdf(book.path);
    } else {
        alert('Format not supported: ' + book.format);
    }
}

/**
 * EPUB Rendering
 */
function renderEpub(arrayBuffer) {
    epubContainer.style.display = 'block';
    fallbackUI.style.display = 'none';
    
    try {
        // Create book from ArrayBuffer
        eReader = ePub(arrayBuffer);
        
        // Configure spread based on mode
        const spreadMode = isSinglePageMode ? "none" : "always";
        
        rendition = eReader.renderTo("epub-render-target", {
            width: "100%",
            height: "100%",
            flow: "paginated",
            spread: spreadMode,
            manager: "default",
            allowScriptedContent: true
        });
        
        // Register a default theme so we can modify it
        rendition.themes.default({
            body: {
                'font-size': epubFontSize + '%'
            }
        });
        
        rendition.display().then(() => {
            updatePageCounter();
        }).catch((error) => {
            console.error("EPUB display error:", error);
            alert("Failed to display EPUB: " + error.message);
        });
        
    } catch (error) {
        console.error("EPUB render error:", error);
        alert("Error rendering EPUB: " + error.message);
    }
}

/**
 * PDF Rendering
 */
function renderPdf(url) {
    pdfLayer.style.display = 'flex';
    fallbackUI.style.display = 'none';
    
    pdfjsLib.getDocument(url).promise.then(doc => {
        pdfDoc = doc;
        pageNum = 1;
        drawPdfSpread();
        updatePageCounter();
    }).catch(error => {
        console.error("PDF loading error:", error);
        alert("Failed to load PDF: " + error.message);
    });
}

function drawPdfSpread() {
    if (!pdfDoc) return;
    
    // Left Page (or single page)
    drawSinglePdfPage(pageNum, canvasLeft);
    
    // Right Page (only in two-page mode)
    if (!isSinglePageMode && pageNum + 1 <= pdfDoc.numPages) {
        canvasRight.style.visibility = "visible";
        canvasRight.style.display = "block";
        drawSinglePdfPage(pageNum + 1, canvasRight);
    } else {
        canvasRight.style.visibility = "hidden";
        canvasRight.style.display = "none";
    }
}

function drawSinglePdfPage(num, canvas) {
    if (!pdfDoc || num > pdfDoc.numPages) return;
    
    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale: pdfScale });
        const ctx = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        page.render(renderContext);
    }).catch(error => {
        console.error("Error rendering page " + num + ":", error);
    });
}

/**
 * Navigation
 */
btnPrev.addEventListener('click', () => {
    if (rendition) {
        rendition.prev();
    }
    
    if (pdfDoc) {
        const step = isSinglePageMode ? 1 : 2;
        pageNum -= step;
        if (pageNum < 1) pageNum = 1;
        drawPdfSpread();
        updatePageCounter();
    }
});

btnNext.addEventListener('click', () => {
    if (rendition) {
        rendition.next();
    }
    
    if (pdfDoc) {
        const step = isSinglePageMode ? 1 : 2;
        const nextPage = pageNum + step;
        
        if (nextPage <= pdfDoc.numPages) {
            pageNum = nextPage;
            drawPdfSpread();
            updatePageCounter();
        }
    }
});

/**
 * State Management
 */
// The following three functions previously drove a status-overlay panel
// (layout mode / current book / last-read time) that has since been
// removed from the HTML. Left as documented no-ops rather than deleting
// their call sites elsewhere, since re-wiring session-state tracking is a
// separate feature decision, not a cleanup one.
function recordState(name) {
    // Status overlay removed — no-op.
}

function updateLayoutStatus() {
    // Status overlay removed — no-op.
}

function restoreSession() {
    // Status overlay removed — no-op.
}

function killEngines() {
    epubContainer.innerHTML = "";
    epubContainer.style.display = 'none';
    pdfLayer.style.display = 'none';
    fallbackUI.style.display = 'flex';
    
    if (rendition) {
        rendition.destroy();
    }
    
    eReader = null;
    rendition = null;
    pdfDoc = null;
    pageNum = 1;
    updatePageCounter();
}

/**
 * Page Counter - Added at end to stay away from zoom code!
 */
const pageInput = document.getElementById('page-input');
const pageTotal = document.getElementById('page-total');

function updatePageCounter() {
    if (pdfDoc) {
        const totalPages = pdfDoc.numPages;
        const currentPage = isSinglePageMode ? pageNum : pageNum;
        pageInput.value = currentPage;
        pageTotal.textContent = `/ ${totalPages}`;
        pageInput.max = totalPages;
    } else if (rendition) {
        // EPUB uses locations, not traditional page numbers
        pageInput.value = '-';
        pageTotal.textContent = '/ EPUB';
        pageInput.disabled = true;
    } else {
        pageInput.value = '1';
        pageTotal.textContent = '/ 0';
        pageInput.disabled = true;
    }
}

// Jump to page when user enters a number
pageInput.addEventListener('change', (e) => {
    if (!pdfDoc) return;
    
    let targetPage = parseInt(e.target.value);
    if (isNaN(targetPage)) return;
    
    // Clamp to valid range
    if (targetPage < 1) targetPage = 1;
    if (targetPage > pdfDoc.numPages) targetPage = pdfDoc.numPages;
    
    pageNum = targetPage;
    drawPdfSpread();
    updatePageCounter();
});
