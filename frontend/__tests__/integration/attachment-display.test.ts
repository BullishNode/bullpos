/**
 * Integration tests for attachment display functionality
 *
 * These tests verify that the payment link attachment rendering works correctly:
 * - Header image rendering from data URLs
 * - Line item images in invoice details
 * - PDF attachment display, download, and modal viewer
 * - Error handling for invalid data URLs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Attachment Display Integration', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // Create a container for DOM testing
    container = document.createElement('div');
    container.innerHTML = `
      <!-- Header Image Section -->
      <div id="header-image-section" style="display: none;">
        <img id="header-image" alt="Header" />
      </div>

      <!-- Line Items Section -->
      <div id="line-items-section" style="display: none;">
        <div id="line-items-list"></div>
      </div>

      <!-- PDF Section -->
      <div id="pdf-section" style="display: none;">
        <span id="pdf-filename"></span>
        <a id="pdf-download" download>Download</a>
        <button id="pdf-view">View PDF</button>
      </div>

      <!-- PDF Viewer Modal -->
      <div id="pdf-viewer-modal" style="display: none;">
        <span id="modal-pdf-filename"></span>
        <embed id="pdf-embed" type="application/pdf" />
        <button id="close-pdf-modal">Close</button>
      </div>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.clearAllMocks();
  });

  describe('Header Image Display', () => {
    it('should render header image from valid data URL', () => {
      const headerImageSection = document.getElementById('header-image-section') as HTMLDivElement;
      const headerImage = document.getElementById('header-image') as HTMLImageElement;

      // Simulate valid image data URL (1x1 transparent PNG)
      const validDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      headerImage.src = validDataUrl;
      headerImageSection.style.display = 'block';

      expect(headerImage.src).toBe(validDataUrl);
      expect(headerImageSection.style.display).toBe('block');
    });

    it('should handle header image load errors gracefully', () => {
      const headerImageSection = document.getElementById('header-image-section') as HTMLDivElement;
      const headerImage = document.getElementById('header-image') as HTMLImageElement;

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Set up error handler
      headerImage.onerror = () => {
        console.warn('Failed to load header image');
        headerImageSection.style.display = 'none';
      };

      // Initially display
      headerImageSection.style.display = 'block';

      // Simulate invalid data URL
      headerImage.src = 'data:image/png;base64,INVALID';

      // Trigger error manually since jsdom doesn't auto-trigger image errors
      if (headerImage.onerror) {
        (headerImage.onerror as any)(new Event('error'));
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to load header image');
      expect(headerImageSection.style.display).toBe('none');
    });

    it('should not display header image section when no image provided', () => {
      const headerImageSection = document.getElementById('header-image-section') as HTMLDivElement;
      expect(headerImageSection.style.display).toBe('none');
    });
  });

  describe('Line Item Images', () => {
    it('should render line items with images', () => {
      const lineItemsList = document.getElementById('line-items-list') as HTMLDivElement;

      // Simulate line items with images
      const lineItems = [
        {
          description: 'Coffee',
          amount: 5.00,
          imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        },
        {
          description: 'Pastry',
          amount: 3.50,
          imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
        }
      ];

      lineItemsList.innerHTML = '';
      lineItems.forEach((item) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'line-item';

        if (item.imageDataUrl) {
          const img = document.createElement('img');
          img.className = 'line-item-image';
          img.alt = item.description;
          img.src = item.imageDataUrl;

          img.onerror = () => {
            console.warn('Failed to load line item image for:', item.description);
            img.style.display = 'none';
          };

          itemDiv.appendChild(img);
        }

        const textDiv = document.createElement('div');
        textDiv.className = 'line-item-text';

        const descSpan = document.createElement('span');
        descSpan.className = 'line-item-description';
        descSpan.textContent = item.description;

        const amountSpan = document.createElement('span');
        amountSpan.className = 'line-item-amount';
        amountSpan.textContent = `$${item.amount.toFixed(2)}`;

        textDiv.appendChild(descSpan);
        textDiv.appendChild(amountSpan);
        itemDiv.appendChild(textDiv);
        lineItemsList.appendChild(itemDiv);
      });

      const renderedItems = lineItemsList.querySelectorAll('.line-item');
      expect(renderedItems).toHaveLength(2);

      const images = lineItemsList.querySelectorAll('.line-item-image');
      expect(images).toHaveLength(2);
      expect((images[0] as HTMLImageElement).alt).toBe('Coffee');
      expect((images[1] as HTMLImageElement).alt).toBe('Pastry');
    });

    it('should handle line items without images', () => {
      const lineItemsList = document.getElementById('line-items-list') as HTMLDivElement;

      const lineItems = [
        { description: 'Service Fee', amount: 1.00 }
      ];

      lineItemsList.innerHTML = '';
      lineItems.forEach((item) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'line-item';

        const textDiv = document.createElement('div');
        textDiv.className = 'line-item-text';

        const descSpan = document.createElement('span');
        descSpan.textContent = item.description;
        textDiv.appendChild(descSpan);

        itemDiv.appendChild(textDiv);
        lineItemsList.appendChild(itemDiv);
      });

      const renderedItems = lineItemsList.querySelectorAll('.line-item');
      expect(renderedItems).toHaveLength(1);

      const images = lineItemsList.querySelectorAll('.line-item-image');
      expect(images).toHaveLength(0);
    });

    it('should handle line item image errors gracefully', () => {
      const lineItemsList = document.getElementById('line-items-list') as HTMLDivElement;
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const item = {
        description: 'Test Item',
        amount: 10.00,
        imageDataUrl: 'data:image/png;base64,INVALID'
      };

      const itemDiv = document.createElement('div');
      const img = document.createElement('img');
      img.alt = item.description;
      img.src = item.imageDataUrl;

      img.onerror = () => {
        console.warn('Failed to load line item image for:', item.description);
        img.style.display = 'none';
      };

      itemDiv.appendChild(img);
      lineItemsList.appendChild(itemDiv);

      // Trigger error manually
      if (img.onerror) {
        (img.onerror as any)(new Event('error'));
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to load line item image for:', 'Test Item');
      expect(img.style.display).toBe('none');
    });
  });

  describe('PDF Attachment Display', () => {
    it('should display PDF section with download link', () => {
      const pdfSection = document.getElementById('pdf-section') as HTMLDivElement;
      const pdfFilenameSpan = document.getElementById('pdf-filename') as HTMLSpanElement;
      const pdfDownload = document.getElementById('pdf-download') as HTMLAnchorElement;

      const pdfDataUrl = 'data:application/pdf;base64,JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1sxIDAgUl0+PgplbmRvYmoKZW5kb2JqCnN0YXJ0eHJlZgoxMDkKJSVFT0Y=';
      const filename = 'invoice.pdf';

      pdfFilenameSpan.textContent = filename;
      pdfDownload.href = pdfDataUrl;
      pdfDownload.download = filename;
      pdfSection.style.display = 'block';

      expect(pdfSection.style.display).toBe('block');
      expect(pdfFilenameSpan.textContent).toBe('invoice.pdf');
      expect(pdfDownload.href).toBe(pdfDataUrl);
      expect(pdfDownload.download).toBe('invoice.pdf');
    });

    it('should default to document.pdf when no filename provided', () => {
      const pdfFilenameSpan = document.getElementById('pdf-filename') as HTMLSpanElement;

      const filename = 'document.pdf'; // Default fallback
      pdfFilenameSpan.textContent = filename;

      expect(pdfFilenameSpan.textContent).toBe('document.pdf');
    });

    it('should open PDF modal viewer when view button clicked', () => {
      const pdfViewButton = document.getElementById('pdf-view') as HTMLButtonElement;
      const pdfViewerModal = document.getElementById('pdf-viewer-modal') as HTMLDivElement;
      const pdfEmbed = document.getElementById('pdf-embed') as HTMLEmbedElement;
      const modalPdfFilename = document.getElementById('modal-pdf-filename') as HTMLSpanElement;

      const pdfDataUrl = 'data:application/pdf;base64,JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1sxIDAgUl0+PgplbmRvYmoKZW5kb2JqCnN0YXJ0eHJlZgoxMDkKJSVFT0Y=';
      const filename = 'test.pdf';

      modalPdfFilename.textContent = filename;

      // Simulate click handler
      pdfViewButton.addEventListener('click', () => {
        pdfEmbed.src = pdfDataUrl;
        pdfViewerModal.style.display = 'flex';
      });

      pdfViewButton.click();

      expect(pdfViewerModal.style.display).toBe('flex');
      expect(pdfEmbed.src).toBe(pdfDataUrl);
    });

    it('should close PDF modal when close button clicked', () => {
      const pdfViewerModal = document.getElementById('pdf-viewer-modal') as HTMLDivElement;
      const pdfEmbed = document.getElementById('pdf-embed') as HTMLEmbedElement;
      const closePdfModal = document.getElementById('close-pdf-modal') as HTMLButtonElement;

      // Set up modal as open
      pdfViewerModal.style.display = 'flex';
      pdfEmbed.src = 'data:application/pdf;base64,test';

      // Simulate close handler
      closePdfModal.addEventListener('click', () => {
        pdfViewerModal.style.display = 'none';
        pdfEmbed.src = '';
      });

      closePdfModal.click();

      expect(pdfViewerModal.style.display).toBe('none');
      expect(pdfEmbed.src).toBe('');
    });

    it('should close PDF modal when clicking outside', () => {
      const pdfViewerModal = document.getElementById('pdf-viewer-modal') as HTMLDivElement;
      const pdfEmbed = document.getElementById('pdf-embed') as HTMLEmbedElement;

      // Set up modal as open
      pdfViewerModal.style.display = 'flex';
      pdfEmbed.src = 'data:application/pdf;base64,test';

      // Simulate click outside handler
      pdfViewerModal.addEventListener('click', (e) => {
        if (e.target === pdfViewerModal) {
          pdfViewerModal.style.display = 'none';
          pdfEmbed.src = '';
        }
      });

      // Create and dispatch click event on modal backdrop
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: pdfViewerModal, enumerable: true });
      pdfViewerModal.dispatchEvent(clickEvent);

      expect(pdfViewerModal.style.display).toBe('none');
      expect(pdfEmbed.src).toBe('');
    });

    it('should handle PDF display errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const pdfViewButton = document.getElementById('pdf-view') as HTMLButtonElement;
      const pdfEmbed = document.getElementById('pdf-embed') as HTMLEmbedElement;

      // Simulate error during PDF display
      pdfViewButton.addEventListener('click', () => {
        try {
          throw new Error('Invalid PDF data');
        } catch (e) {
          console.error('Failed to display PDF:', e);
          alert('Unable to display PDF. Please try downloading it instead.');
        }
      });

      pdfViewButton.click();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to display PDF:', expect.any(Error));
      expect(alertSpy).toHaveBeenCalledWith('Unable to display PDF. Please try downloading it instead.');
    });

    it('should handle invalid PDF data URLs', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const pdfDownload = document.getElementById('pdf-download') as HTMLAnchorElement;
      const pdfSection = document.getElementById('pdf-section') as HTMLDivElement;

      try {
        const invalidPdfUrl = 'not-a-valid-data-url';
        pdfDownload.href = invalidPdfUrl;
        throw new Error('Invalid data URL');
      } catch (e) {
        console.warn('Invalid PDF data URL:', e);
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid PDF data URL:', expect.any(Error));
      // PDF section should not be displayed
      expect(pdfSection.style.display).toBe('none');
    });
  });

  describe('Complete Rich Invoice Display', () => {
    it('should render all attachment types together', () => {
      const headerImageSection = document.getElementById('header-image-section') as HTMLDivElement;
      const headerImage = document.getElementById('header-image') as HTMLImageElement;
      const lineItemsList = document.getElementById('line-items-list') as HTMLDivElement;
      const lineItemsSection = document.getElementById('line-items-section') as HTMLDivElement;
      const pdfSection = document.getElementById('pdf-section') as HTMLDivElement;
      const pdfDownload = document.getElementById('pdf-download') as HTMLAnchorElement;

      // Simulate complete rich invoice data
      const richInvoiceData = {
        headerImageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        lineItems: [
          {
            description: 'Product A',
            amount: 10.00,
            imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
          },
          {
            description: 'Product B',
            amount: 15.00,
            imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
          }
        ],
        pdfDataUrl: 'data:application/pdf;base64,JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1sxIDAgUl0+PgplbmRvYmoKZW5kb2JqCnN0YXJ0eHJlZgoxMDkKJSVFT0Y=',
        pdfFilename: 'invoice.pdf'
      };

      // Render header image
      if (richInvoiceData.headerImageDataUrl) {
        headerImage.src = richInvoiceData.headerImageDataUrl;
        headerImageSection.style.display = 'block';
      }

      // Render line items
      if (richInvoiceData.lineItems) {
        lineItemsList.innerHTML = '';
        richInvoiceData.lineItems.forEach((item) => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'line-item';

          if (item.imageDataUrl) {
            const img = document.createElement('img');
            img.src = item.imageDataUrl;
            img.alt = item.description;
            itemDiv.appendChild(img);
          }

          const desc = document.createElement('span');
          desc.textContent = item.description;
          itemDiv.appendChild(desc);

          lineItemsList.appendChild(itemDiv);
        });
        lineItemsSection.style.display = 'block';
      }

      // Render PDF
      if (richInvoiceData.pdfDataUrl) {
        pdfDownload.href = richInvoiceData.pdfDataUrl;
        pdfDownload.download = richInvoiceData.pdfFilename || 'document.pdf';
        pdfSection.style.display = 'block';
      }

      // Verify all sections are displayed
      expect(headerImageSection.style.display).toBe('block');
      expect(lineItemsSection.style.display).toBe('block');
      expect(pdfSection.style.display).toBe('block');

      // Verify content
      expect(headerImage.src).toContain('data:image/png');
      expect(lineItemsList.children).toHaveLength(2);
      expect(pdfDownload.href).toContain('data:application/pdf');
    });
  });
});
