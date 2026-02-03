/**
 * Uploader Cropper - Wrapper Cropper.js unifié
 * Gère upload + crop + rotate pour images (avatar, items, silhouette, etc.)
 */

class UploaderCropper {
    constructor() {
        this.cropper = null;
        this.currentBlob = null;
        this.currentFile = null;
        this.config = null;
        this.hasCropper = typeof Cropper !== 'undefined';
        this.baseZoom = 1; // Store initial "fit to container" zoom level

        if (!this.hasCropper) {
            console.warn('[UploaderCropper] Cropper.js library not loaded!');
        }
    }

    /**
     * Ouvre le cropper avec un fichier image
     * @param {File} file - Fichier image à cropper
     * @param {object} options - Options de configuration
     * @param {HTMLElement} options.imageElement - Element <img> pour le cropper
     * @param {number} options.aspectRatio - Ratio largeur/hauteur (default: 1 pour carré)
     * @param {number} options.outputWidth - Largeur finale (default: 256)
     * @param {number} options.outputHeight - Hauteur finale (default: outputWidth)
     * @param {number} options.quality - Qualité JPEG/PNG (0-1, default: 0.92)
     * @param {string} options.outputFormat - Format ('image/png' ou 'image/jpeg', default: 'image/png')
     * @param {function} options.onConfirm - Callback(blob, blobUrl) appelé après crop
     * @param {function} options.onCancel - Callback appelé si annulation
     * @param {boolean} options.enableRotate - Activer rotation (default: true)
     * @param {boolean} options.enableZoom - Activer zoom (default: true)
     * @returns {boolean} - true si succès, false si échec
     */
    open(file, options = {}) {
        if (!file) {
            console.error('[UploaderCropper] No file provided');
            return false;
        }

        if (!file.type.startsWith('image/')) {
            console.error('[UploaderCropper] Invalid file type:', file.type);
            if (options.onCancel) options.onCancel('Invalid file type');
            return false;
        }

        if (!options.imageElement || !(options.imageElement instanceof HTMLImageElement)) {
            console.error('[UploaderCropper] Invalid imageElement provided');
            return false;
        }

        // Destroy existing cropper BEFORE setting new config
        this.destroy();

        this.currentFile = file;
        this.config = {
            imageElement: options.imageElement,
            aspectRatio: options.aspectRatio ?? 1,
            outputWidth: options.outputWidth ?? 256,
            outputHeight: options.outputHeight ?? options.outputWidth ?? 256,
            quality: options.quality ?? 0.92,
            outputFormat: options.outputFormat ?? 'image/png',
            onConfirm: options.onConfirm || null,
            onCancel: options.onCancel || null,
            onZoomChange: options.onZoomChange || null,
            onCropChange: options.onCropChange || null,
            enableRotate: options.enableRotate !== false,
            enableZoom: options.enableZoom !== false,
        };

        // Create blob URL
        const blobUrl = URL.createObjectURL(file);
        this.config.imageElement.src = blobUrl;

        // Wait for image to load, then initialize cropper
        this.config.imageElement.onload = () => {
            this._initCropper();
        };

        this.config.imageElement.onerror = () => {
            console.error('[UploaderCropper] Failed to load image');
            URL.revokeObjectURL(blobUrl);
            if (this.config.onCancel) this.config.onCancel('Failed to load image');
        };

        console.log('[UploaderCropper] Opened with file:', file.name, file.size, 'bytes');
        return true;
    }

    /**
     * Initialize Cropper.js instance
     * @private
     */
    _initCropper() {
        if (!this.hasCropper) {
            console.warn('[UploaderCropper] Cropper.js not available, skipping crop functionality');
            return;
        }

        const cropperOptions = {
            aspectRatio: this.config.aspectRatio,
            viewMode: 1, // Restrict crop box to canvas, allow canvas smaller than container
            dragMode: 'move',
            background: true, // Grid background like cropper-test.html
            autoCropArea: 0.8, // 80% initial crop area
            responsive: true,
            restore: true,
            guides: true,
            center: true,
            highlight: true,
            cropBoxMovable: true,
            cropBoxResizable: true, // ALWAYS resizable for FREE cropping
            toggleDragModeOnDblclick: false,
            minCropBoxWidth: 50, // Allow very small crop boxes
            minCropBoxHeight: 50,
            modal: true, // Dark overlay around crop box
            ready: () => {
                // Store the initial "fit to container" zoom as base (100%)
                const imageData = this.cropper.getImageData();
                this.baseZoom = imageData.width / imageData.naturalWidth;
                console.log('[UploaderCropper] Base zoom set to:', this.baseZoom);

                // Trigger zoom info update callback if provided
                if (this.config.onZoomChange) {
                    this.config.onZoomChange(this.getZoomPercent());
                }
            },
            zoom: () => {
                // Trigger zoom info update callback if provided
                if (this.config.onZoomChange) {
                    this.config.onZoomChange(this.getZoomPercent());
                }
            },
            crop: () => {
                // Trigger crop info update callback if provided
                if (this.config.onCropChange) {
                    this.config.onCropChange(this.cropper.getData());
                }
            }
        };

        // Enable rotation controls if requested
        if (this.config.enableRotate) {
            cropperOptions.rotatable = true;
        }

        // Enable zoom controls if requested
        if (this.config.enableZoom) {
            cropperOptions.zoomable = true;
            cropperOptions.zoomOnWheel = true;
            cropperOptions.wheelZoomRatio = 0.1;
        }

        this.cropper = new Cropper(this.config.imageElement, cropperOptions);

        console.log('[UploaderCropper] Cropper initialized with aspectRatio:', this.config.aspectRatio);
    }

    /**
     * Confirme le crop et génère le blob final
     * @returns {Promise<{blob: Blob, blobUrl: string}>}
     */
    async confirm() {
        if (!this.cropper) {
            console.error('[UploaderCropper] No active cropper instance');
            return null;
        }

        try {
            const canvas = this.cropper.getCroppedCanvas({
                width: this.config.outputWidth,
                height: this.config.outputHeight,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });

            if (!canvas) {
                console.error('[UploaderCropper] Failed to generate canvas');
                return null;
            }

            const blob = await new Promise((resolve) =>
                canvas.toBlob(resolve, this.config.outputFormat, this.config.quality)
            );

            if (!blob) {
                console.error('[UploaderCropper] Failed to generate blob');
                return null;
            }

            this.currentBlob = blob;
            const blobUrl = URL.createObjectURL(blob);

            console.log('[UploaderCropper] Crop confirmed:', blob.size, 'bytes');

            // Callback
            if (this.config.onConfirm) {
                this.config.onConfirm(blob, blobUrl);
            }

            return { blob, blobUrl };
        } catch (error) {
            console.error('[UploaderCropper] Error during crop:', error);
            return null;
        }
    }

    /**
     * Annule le crop en cours
     */
    cancel() {
        console.log('[UploaderCropper] Crop cancelled');
        if (this.config?.onCancel) {
            this.config.onCancel();
        }
        this.destroy();
    }

    /**
     * Détruit le cropper actuel
     */
    destroy() {
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }

        // Revoke blob URL
        if (this.config?.imageElement?.src?.startsWith('blob:')) {
            URL.revokeObjectURL(this.config.imageElement.src);
        }

        this.currentFile = null;
        this.config = null;
        this.baseZoom = 1;
        console.log('[UploaderCropper] Destroyed');
    }

    /**
     * Rotate l'image (utile pour mode paysage)
     * @param {number} degrees - Degrés de rotation (ex: 90, -90, 180)
     */
    rotate(degrees) {
        if (!this.cropper) {
            console.warn('[UploaderCropper] No active cropper to rotate');
            return;
        }
        this.cropper.rotate(degrees);
        console.log('[UploaderCropper] Rotated by', degrees, 'degrees');
    }

    /**
     * Zoom in/out
     * @param {number} ratio - Ratio de zoom (>0, ex: 0.1 pour zoom in, -0.1 pour zoom out)
     */
    zoom(ratio) {
        if (!this.cropper) {
            console.warn('[UploaderCropper] No active cropper to zoom');
            return;
        }
        this.cropper.zoom(ratio);
    }

    /**
     * Get current zoom as percentage relative to initial fit (100%)
     * @returns {number} Zoom percentage
     */
    getZoomPercent() {
        if (!this.cropper) return 100;
        const imageData = this.cropper.getImageData();
        const currentZoom = imageData.width / imageData.naturalWidth;
        return Math.round((currentZoom / this.baseZoom) * 100);
    }

    /**
     * Zoom to specific percentage (relative to initial fit)
     * @param {number} percent - Target zoom percentage (100 = initial fit)
     */
    zoomToPercent(percent) {
        if (!this.cropper) {
            console.warn('[UploaderCropper] No active cropper to zoom');
            return;
        }
        const targetZoom = this.baseZoom * (percent / 100);
        this.cropper.zoomTo(targetZoom);
    }

    /**
     * Zoom in by 10%
     */
    zoomIn() {
        this.zoom(0.1);
    }

    /**
     * Zoom out by 10%
     */
    zoomOut() {
        this.zoom(-0.1);
    }

    /**
     * Reset le crop à l'état initial
     */
    reset() {
        if (!this.cropper) {
            console.warn('[UploaderCropper] No active cropper to reset');
            return;
        }
        this.cropper.reset();
        console.log('[UploaderCropper] Reset to initial state');
    }

    /**
     * Scale l'image
     * @param {number} scaleX - Scale horizontal (-1 pour flip)
     * @param {number} scaleY - Scale vertical (-1 pour flip)
     */
    scale(scaleX, scaleY) {
        if (!this.cropper) {
            console.warn('[UploaderCropper] No active cropper to scale');
            return;
        }
        this.cropper.scale(scaleX, scaleY);
    }

    /**
     * Flip horizontal
     */
    flipX() {
        if (!this.cropper) return;
        const imageData = this.cropper.getImageData();
        this.scale(imageData.scaleX === 1 ? -1 : 1, imageData.scaleY);
    }

    /**
     * Flip vertical
     */
    flipY() {
        if (!this.cropper) return;
        const imageData = this.cropper.getImageData();
        this.scale(imageData.scaleX, imageData.scaleY === 1 ? -1 : 1);
    }

    /**
     * Utilitaire: Ouvre un file picker et déclenche le cropper
     * @param {object} options - Options (mêmes que open())
     * @param {string} options.accept - Types de fichiers acceptés (default: 'image/*')
     * @returns {Promise<File|null>} - Fichier sélectionné ou null si annulé
     */
    async pickFile(options = {}) {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = options.accept || 'image/*';

            input.onchange = (event) => {
                const file = event.target.files?.[0];
                if (file) {
                    this.open(file, options);
                    resolve(file);
                } else {
                    resolve(null);
                }
            };

            input.oncancel = () => {
                resolve(null);
            };

            input.click();
        });
    }
}

// Instance globale
const uploaderCropper = new UploaderCropper();

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = uploaderCropper;
}
