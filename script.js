// script.js - Logic for Enhanced Smart Parking System

// --- DOM Elements ---
const fileInput = document.getElementById('fileInput');
const mainCanvas = document.getElementById('mainCanvas');
const processedCanvas = document.getElementById('processedCanvas');
const mainCtx = mainCanvas.getContext('2d');
const processedCtx = processedCanvas.getContext('2d');
const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');
const toggleBtn = document.getElementById('toggleBtn');
const statusBar = document.getElementById('statusBar');
const thresholdValue = document.getElementById('thresholdValue');
const thresholdValueDisplay = document.getElementById('thresholdValueDisplay');
const spaceWidth = document.getElementById('spaceWidth');
const spaceHeight = document.getElementById('spaceHeight');
const detectionMethod = document.getElementById('detectionMethod');
const confidenceThreshold = document.getElementById('confidenceThreshold');
const confidenceThresholdDisplay = document.getElementById('confidenceThresholdDisplay');
const loadingIndicator = document.getElementById('loadingIndicator');
const parkingGrid = document.getElementById('parkingGrid');
const parkingSpotSelect = document.getElementById('parkingSpot');
const bookBtn = document.getElementById('bookBtn');
const totalSpacesElement = document.getElementById('totalSpaces');
const availableSpacesElement = document.getElementById('availableSpaces');
const occupiedSpacesElement = document.getElementById('occupiedSpaces');
const bookedSpacesElement = document.getElementById('bookedSpaces');
const suitableSpacesElement = document.getElementById('suitableSpaces'); // New element
const currentBookingsList = document.getElementById('currentBookings');
const bookingHistoryList = document.getElementById('bookingHistory');
const allTabs = document.querySelectorAll('.tab');
const bookingMessage = document.getElementById('bookingMessage');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const durationInput = document.getElementById('duration');
const vehicleNumberInput = document.getElementById('vehicleNumber');
const carSizeSelect = document.getElementById('carSize'); // New element
const yoloOptions = document.querySelectorAll('.yolo-option'); // Options specific to YOLO
const traditionalOptions = document.querySelectorAll('.traditional-option'); // Options specific to Traditional

// --- Application State ---
let parkingSpaces = []; // { id: string, x: number, y: number, sizeCategory: 'S'|'M'|'L' } - Added sizeCategory
let mediaElement = null;
let isVideo = false;
let isProcessing = false;
let animationFrameId = null;
let showProcessed = false;
let yoloModel = null; // For ONNX Runtime
let bookings = []; // { bookingId: string, spaceId: string, vehicle: string, startTime: number, durationHours: number }
let bookingHistory = []; // Same structure as bookings
let parkingSpotStatuses = {}; // { [spaceId]: 'free' | 'occupied' | 'booked' }
let frameCounter = 0; // For potential frame skipping
const PROCESS_EVERY_N_FRAMES = 2; // Adjust for performance tuning (1 = process every frame)

// --- Constants ---
const SPOT_SIZES = {
    S: 'Small',
    M: 'Medium',
    L: 'Large'
};
const CAR_SIZE_COMPATIBILITY = {
    small: ['S', 'M', 'L'],
    medium: ['M', 'L'],
    large: ['L']
};

// --- Initialization ---
function init() {
    console.log("Initializing Smart Parking System...");
    loadParkingSpaces(); // Load spots first
    loadBookings(); // Load bookings second (depends on spots)
    setupEventListeners();
    setupTabs();
    updateDashboardStats(); // Initial update
    updateParkingGrid(); // Initial render of grid
    updateBookingDropdown(); // Initial update based on default car size
    toggleAlgorithmOptions(); // Show/hide options based on initial selection
    // Add initial animation classes to cards
    document.querySelectorAll('.card').forEach((card, index) => {
        card.style.setProperty('--card-index', index);
    });
    console.log("Initialization complete.");
    // Delay YOLO load slightly to allow UI to render
    setTimeout(loadYOLOModel, 500);
}

// --- Model Loading (Simulated YOLO, Placeholders for others) ---
async function loadYOLOModel() {
     if (yoloModel) return; // Already loaded or loading
    console.log('Attempting to load YOLO model...');
    if (detectionMethod.value !== 'yolo') {
        console.log('YOLO not selected, skipping load for now.');
        return;
    }
    try {
        // Placeholder: Replace with actual ONNX model loading if available
        // const session = await ort.InferenceSession.create('./path/to/your/model.onnx');
        // yoloModel = { loaded: true, session: session, predict: /* your prediction logic */ };

        // --- Simulation ---
        updateStatus("Loading AI Model...", true);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate load time (reduced)
         yoloModel = {
             loaded: true,
             // Simulated predict function
             predict: async (imageData) => {
                 // Simulate prediction time (reduced for perceived speed)
                 await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
                 const detections = [];
                 const confidence = parseInt(confidenceThreshold.value) / 100;
                 const w = parseInt(spaceWidth.value);
                 const h = parseInt(spaceHeight.value);

                 // Simulate detections based on existing spots (higher chance if spot exists)
                 for (const space of parkingSpaces) {
                      const occupiedChance = parkingSpotStatuses[space.id] === 'occupied' ? 0.8 : 0.3; // Higher chance if actually occupied
                     if (Math.random() < occupiedChance) {
                         detections.push({
                             x: space.x + (Math.random() - 0.5) * (w * 0.2), // Offset within spot
                             y: space.y + (Math.random() - 0.5) * (h * 0.2),
                             width: w * (0.8 + Math.random() * 0.3), // Vary size slightly
                             height: h * (0.8 + Math.random() * 0.3),
                             class: 'car',
                             confidence: 0.5 + Math.random() * 0.5 // Random confidence
                         });
                     }
                 }
                 // Add some random noise detections
                 for(let i=0; i< 2; i++) {
                     if (Math.random() < 0.1) {
                          detections.push({
                             x: Math.random() * mainCanvas.width,
                             y: Math.random() * mainCanvas.height,
                             width: w * (0.5 + Math.random()),
                             height: h * (0.5 + Math.random()),
                             class: 'noise',
                             confidence: 0.1 + Math.random() * 0.4
                         });
                     }
                 }

                 return detections.filter(d => d.confidence >= confidence && d.class === 'car'); // Filter by confidence and class
             }
         };
        // --- End Simulation ---

        console.log('YOLO model simulated load successfully.');
         updateStatus("AI Model Ready");

    } catch (error) {
        console.error('Failed to load YOLO model:', error);
        updateStatus('AI Load Failed', false, true); // Mark as error
        // Optionally switch back to traditional if YOLO fails
        // detectionMethod.value = 'traditional';
        // toggleAlgorithmOptions();
    }
}

// --- Local Storage Handling ---
function loadParkingSpaces() {
    const savedSpaces = localStorage.getItem('smartparking_spaces_v2'); // Use new key for sizeCategory
    if (savedSpaces) {
        parkingSpaces = JSON.parse(savedSpaces);
        console.log(`Loaded ${parkingSpaces.length} parking spaces.`);
        // Ensure all loaded spaces have a sizeCategory (backward compatibility)
        parkingSpaces.forEach(space => {
            if (!space.sizeCategory) {
                space.sizeCategory = 'M'; // Default to Medium if missing
            }
        });
    }
    // Initialize statuses based on loaded spots
    parkingSpaces.forEach(space => {
        if (!parkingSpotStatuses[space.id]) {
            parkingSpotStatuses[space.id] = 'free'; // Default to free if no booking info yet
        }
    });
}

function saveParkingSpaces() {
    localStorage.setItem('smartparking_spaces_v2', JSON.stringify(parkingSpaces));
}

function loadBookings() {
    const savedBookings = localStorage.getItem('smartparking_bookings');
    if (savedBookings) {
        bookings = JSON.parse(savedBookings);
        console.log(`Loaded ${bookings.length} active bookings.`);
        // Update statuses based on bookings
        bookings.forEach(booking => {
            if (parkingSpotStatuses[booking.spaceId]) { // Check if spot still exists
                 parkingSpotStatuses[booking.spaceId] = 'booked';
            } else {
                 console.warn(`Booking found for non-existent spot ${booking.spaceId}. Removing booking.`);
                 // Optionally move to history or just discard
            }
        });
        // Clean up bookings for non-existent spots
        bookings = bookings.filter(b => parkingSpotStatuses[b.spaceId]);
    }
    const savedHistory = localStorage.getItem('smartparking_bookingHistory');
    if (savedHistory) {
        bookingHistory = JSON.parse(savedHistory);
         console.log(`Loaded ${bookingHistory.length} historical bookings.`);
    }
    saveBookings(); // Resave in case cleanup happened
}

function saveBookings() {
    localStorage.setItem('smartparking_bookings', JSON.stringify(bookings));
    localStorage.setItem('smartparking_bookingHistory', JSON.stringify(bookingHistory));
    updateBookingLists(); // Update UI immediately after saving
    updateParkingGrid(); // Reflect booking status changes in grid
    updateDashboardStats();
    updateBookingDropdown(); // Reflect availability changes
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    fileInput.addEventListener('change', handleFileUpload);
    mainCanvas.addEventListener('click', handleCanvasClick);
    mainCanvas.addEventListener('contextmenu', handleRightClick);
    processBtn.addEventListener('click', startProcessing);
    resetBtn.addEventListener('click', resetParkingSpaces);
    toggleBtn.addEventListener('click', toggleProcessedView);
    bookBtn.addEventListener('click', handleBookingAttempt);
    clearHistoryBtn.addEventListener('click', clearBookingHistory);
    carSizeSelect.addEventListener('change', updateBookingDropdown); // Update dropdown on car size change

    thresholdValue.addEventListener('input', () => {
        thresholdValueDisplay.textContent = thresholdValue.value;
        // No automatic reprocess on slider change for performance
    });

    confidenceThreshold.addEventListener('input', () => {
        const value = (parseInt(confidenceThreshold.value) / 100).toFixed(2);
        confidenceThresholdDisplay.textContent = value;
        // No automatic reprocess on slider change for performance
    });

    spaceWidth.addEventListener('input', updateSpaceDimensions);
    spaceHeight.addEventListener('input', updateSpaceDimensions);

    detectionMethod.addEventListener('change', () => {
        toggleAlgorithmOptions(); // Show/hide relevant options
        if (detectionMethod.value === 'yolo' && !yoloModel?.loaded) {
            loadYOLOModel(); // Attempt to load if switched to YOLO
        }
        stopProcessing(); // Stop current processing if method changes
    });

    // Delegated event listener for cancel buttons in current bookings
    currentBookingsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('cancel-booking-btn')) {
            const bookingId = e.target.dataset.bookingId;
            cancelBooking(bookingId);
        }
    });
}

// --- UI Helper Functions ---

function toggleAlgorithmOptions() {
    const selectedMethod = detectionMethod.value;
    yoloOptions.forEach(el => el.classList.toggle('hidden', selectedMethod !== 'yolo'));
    traditionalOptions.forEach(el => el.classList.toggle('hidden', selectedMethod !== 'traditional'));
    // Add similar lines here if POD, Oct Dept, PakStra have specific options
}

function updateStatus(message, processing = false, error = false) {
    statusBar.textContent = message;
    statusBar.classList.toggle('processing', processing && !error);
    statusBar.classList.toggle('error', error);
    loadingIndicator.classList.toggle('visible', processing && !error);

    // Clear status after a delay if it's not a processing message
    if (!processing && !error && message !== "System Idle") {
        setTimeout(() => {
            // Only clear if the status hasn't changed again
            if (statusBar.textContent === message) {
                updateStatus("System Idle");
            }
        }, 3000);
    } else if (error) {
         setTimeout(() => {
            if (statusBar.textContent === message) {
                 updateStatus("System Idle");
            }
         }, 5000); // Keep error message longer
    }
}

// --- Tab Functionality ---
function setupTabs() {
     allTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            // Find the closest common ancestor that contains both tabs and content (e.g., card-body or a specific container)
            const tabGroupContainer = this.closest('.card-body, .booking-management-card .card-body'); // Adjust selector as needed

             if (!tabGroupContainer) return;

            // Deactivate other tabs within the same group
            tabGroupContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Hide other tab contents within the same group
            tabGroupContainer.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            // Show the clicked tab's content
            const activeContent = tabGroupContainer.querySelector(`.tab-content[data-tab="${tabName}"]`);
             if (activeContent) {
                 activeContent.classList.add('active');
             }
        });
    });
}


// --- Media Handling ---
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    stopProcessing(); // Stop any previous processing/video loop
    URL.revokeObjectURL(mediaElement?.src); // Revoke old URL
     mediaElement = null; // Reset media element
     updateStatus("Loading media...");

    const url = URL.createObjectURL(file);

    if (file.type.startsWith('image/')) {
        isVideo = false;
        mediaElement = new Image();
        mediaElement.onload = () => {
            console.log(`Image loaded: ${mediaElement.width}x${mediaElement.height}`);
            setupCanvas(mediaElement.width, mediaElement.height);
            drawFrame(); // Draw initial frame
            URL.revokeObjectURL(url); // Can revoke after loading into Image
            // --- MODIFICATION: Automatically process images after loading ---
            updateStatus("Image loaded. Starting automatic processing..."); // Update status message
            startProcessing(); // Automatically process the loaded image
            // --- END MODIFICATION ---
        };
         mediaElement.onerror = () => {
             updateStatus("Error loading image.", false, true);
             URL.revokeObjectURL(url);
         }
    } else if (file.type.startsWith('video/')) {
        isVideo = true;
        mediaElement = document.createElement('video');
        mediaElement.muted = true; // Mute for autoplay policy
        mediaElement.loop = true;
        mediaElement.playsInline = true; // Important for mobile
        mediaElement.onloadedmetadata = () => {
             console.log(`Video loaded: ${mediaElement.videoWidth}x${mediaElement.videoHeight}`);
            setupCanvas(mediaElement.videoWidth, mediaElement.videoHeight);
             updateStatus("Video loaded. Starting playback...");
            mediaElement.play().then(() => {
                 console.log("Video playback started.");
                 startProcessing(); // Automatically start processing video
            }).catch(e => {
                console.error("Video play failed:", e);
                 updateStatus("Video playback failed. Press 'Process Media'.", false, true);
            });
        };
         mediaElement.onerror = (err) => {
             console.error("Video loading error:", err);
             updateStatus("Error loading video.", false, true);
             URL.revokeObjectURL(url); // Revoke on error too
         }
    } else {
         updateStatus("Unsupported file type.", false, true);
         URL.revokeObjectURL(url);
         return;
    }
    mediaElement.src = url;
}

function setupCanvas(width, height) {
    // Maintain aspect ratio while fitting within a max width/height if needed
     const container = mainCanvas.parentElement;
     if (!container) return;
     const maxWidth = container.clientWidth; // Max width based on container
     const maxHeight = window.innerHeight * 0.6; // Limit height relative to viewport
     let displayWidth = width;
     let displayHeight = height;
     const aspectRatio = width / height;

     if (displayWidth > maxWidth) {
         displayWidth = maxWidth;
         displayHeight = displayWidth / aspectRatio;
     }
     if (displayHeight > maxHeight) {
         displayHeight = maxHeight;
         displayWidth = displayHeight * aspectRatio;
     }
     // Ensure width doesn't exceed max again after height adjustment
      if (displayWidth > maxWidth) {
         displayWidth = maxWidth;
         displayHeight = displayWidth / aspectRatio;
     }


     mainCanvas.width = width; // Keep internal resolution
     mainCanvas.height = height;
     processedCanvas.width = width;
     processedCanvas.height = height;

     // Set display size via CSS
     mainCanvas.style.width = `${displayWidth}px`;
     mainCanvas.style.height = `${displayHeight}px`;
     processedCanvas.style.width = `${displayWidth}px`;
     processedCanvas.style.height = `${displayHeight}px`;

     console.log(`Canvas setup: Internal ${width}x${height}, Display ${displayWidth.toFixed(0)}x${displayHeight.toFixed(0)}`);
}

// --- Drawing & Processing Loop ---
function drawFrame() {
     if (!mediaElement || !mainCtx || mainCanvas.width === 0 || mainCanvas.height === 0) return;
     // Clear main canvas
     mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
     // Draw current media frame
     try {
         // Ensure media is ready (especially for video)
         if (isVideo && mediaElement.readyState < mediaElement.HAVE_CURRENT_DATA) {
             // console.warn("Video data not ready for drawing yet.");
             return; // Wait for next frame
         }
         mainCtx.drawImage(mediaElement, 0, 0, mainCanvas.width, mainCanvas.height);
     } catch (e) {
          console.error("Error drawing media element:", e);
          stopProcessing(); // Stop if drawing fails
          updateStatus("Error drawing media.", false, true);
          return; // Exit function if error
     }
     // Draw parking space outlines
     drawParkingSpacesOnCanvas();
}

function drawParkingSpacesOnCanvas() {
    if (!mainCtx) return;
    const w = parseInt(spaceWidth.value);
    const h = parseInt(spaceHeight.value);

    parkingSpaces.forEach(space => {
        const status = parkingSpotStatuses[space.id] || 'free';
        let color = '#FF00FF'; // Default magenta for undefined spots
        let lineWidth = 2;

        switch (status) {
             case 'free': color = '#7ED321'; break; // Green
             case 'occupied': color = '#D0021B'; break; // Red
             case 'booked': color = '#F5A623'; break; // Orange
        }

        // Highlight suitable free spots based on selected car size
        if (status === 'free' && isSpotSuitable(space, carSizeSelect.value)) {
             color = '#4AB1E2'; // Info blue for suitable
             lineWidth = 3; // Make border thicker
        }


        mainCtx.strokeStyle = color;
        mainCtx.lineWidth = lineWidth;
        mainCtx.strokeRect(space.x, space.y, w, h);

        // Add space ID text with background
         const text = `${space.id.replace('space-', 'S')}${space.sizeCategory}`; // e.g., S1M
         const textWidth = mainCtx.measureText(text).width;
         mainCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
         mainCtx.fillRect(space.x, space.y, textWidth + 6, 14); // Small background rect for text
        mainCtx.fillStyle = 'white';
        mainCtx.font = 'bold 10px Arial';
        mainCtx.fillText(text, space.x + 3, space.y + 10);
    });
}

function startProcessing() {
    if (!mediaElement) {
        updateStatus('Please upload an image or video first.', false, true);
        return;
    }
    if (isProcessing) return; // Already processing

    isProcessing = true;
    frameCounter = 0; // Reset frame counter
    updateStatus(`Processing with ${detectionMethod.options[detectionMethod.selectedIndex].text}...`, true);
    console.log(`Starting processing using ${detectionMethod.value} method.`);


    if (isVideo) {
        // Ensure video is playing if paused
        if (mediaElement.paused) {
             mediaElement.play().catch(e => {
                 console.error("Video play failed on process start:", e);
                 updateStatus("Video playback failed.", false, true);
                 isProcessing = false; // Stop processing if play fails
                 return;
             });
        }
        animateVideoLoop(); // Start video loop
    } else {
         // Process single image
         drawFrame(); // Ensure frame is drawn
         processFrame().then((changed) => {
             isProcessing = false; // Stop after one frame for image
             updateStatus('Processing Complete'); // Update status after processing finishes
             if (changed) {
                  updateParkingGrid(); // Update grid if status changed
                  updateDashboardStats();
                  updateBookingDropdown(); // Update dropdown based on new free/suitable spots
             }
         }).catch(error => {
             console.error("Image processing failed:", error);
              isProcessing = false;
              updateStatus('Processing Error', false, true);
         });
    }
}

function stopProcessing() {
    if (!isProcessing && !animationFrameId) return; // Not running

    isProcessing = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (isVideo && mediaElement && !mediaElement.paused) {
        mediaElement.pause();
    }
     // Only update status if it wasn't already showing 'Processing Complete' or an error
     if (!statusBar.textContent.includes('Complete') && !statusBar.classList.contains('error')) {
        updateStatus('Processing Stopped');
     }
     console.log("Processing stopped.");
}

function animateVideoLoop() {
    if (!isProcessing || !isVideo) {
        stopProcessing(); // Ensure cleanup if state changes unexpectedly
        return; // Stop condition
    }

     // Draw the current video frame
     drawFrame();

     // Process the frame conditionally based on frame counter
     frameCounter++;
     let processPromise = Promise.resolve(false); // Default to no change
     if (frameCounter % PROCESS_EVERY_N_FRAMES === 0) {
          processPromise = processFrame();
     }

     processPromise.then((changed) => {
         // Update UI only if status actually changed
         if (changed) {
              updateParkingGrid();
              updateDashboardStats();
              updateBookingDropdown();
         }
         // Request next frame
         animationFrameId = requestAnimationFrame(animateVideoLoop);
     }).catch(error => {
         console.error("Video frame processing failed:", error);
         updateStatus("Processing Error in Loop", false, true);
         stopProcessing(); // Stop loop on error
     });
}

async function processFrame() {
     // 1. Get Image Data from main canvas
     if (!mainCtx || mainCanvas.width === 0 || mainCanvas.height === 0) {
         throw new Error("Main context or canvas dimensions not available");
     }
     // Check if canvas is blank (can happen briefly during loading)
     if (!mainCtx.getImageData(0, 0, 1, 1).data[3]) { // Check alpha of first pixel
         console.warn("Canvas is blank, skipping processing this frame.");
         return false; // No change
     }
     const imageData = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);


     // 2. Choose detection method
     let occupiedIds = new Set();
     const method = detectionMethod.value;

     try {
         switch (method) {
             case 'yolo':
                 if (yoloModel?.loaded) {
                     occupiedIds = await processWithYOLO(imageData);
                 } else {
                     console.warn("YOLO selected but not loaded.");
                     // Don't show error status continuously in loop, just log
                     if (!isVideo) updateStatus("YOLO model not ready.", false, true);
                     occupiedIds = new Set(); // Return empty if model not ready
                 }
                 break;
             case 'traditional':
                 occupiedIds = processWithTraditional(imageData);
                 break;
             case 'pod':
                 occupiedIds = await processWithPOD_Simulated(imageData);
                 break;
             case 'oct_dept':
                 occupiedIds = await processWithOctDept_Simulated(imageData);
                 break;
             case 'pakstra':
                 occupiedIds = await processWithPakStra_Simulated(imageData);
                 break;
             default:
                 console.error("Unknown detection method:", method);
                 occupiedIds = new Set();
         }
     } catch (error) {
         console.error(`Error during ${method} processing:`, error);
         // Only show status error for images or first video error
         if (!isVideo || !statusBar.classList.contains('error')) {
            updateStatus(`Error in ${method} algorithm.`, false, true);
         }
         occupiedIds = new Set(); // Default to no detections on error
     }


     // 3. Update statuses (Important: Only change 'free' to 'occupied')
     let changed = false;
     parkingSpaces.forEach(space => {
          const currentStatus = parkingSpotStatuses[space.id];
          // Only update if NOT booked. Detection overrides 'free'.
          if (currentStatus !== 'booked') {
              const newStatus = occupiedIds.has(space.id) ? 'occupied' : 'free';
              if (currentStatus !== newStatus) {
                   parkingSpotStatuses[space.id] = newStatus;
                   changed = true;
              }
          }
     });

    // 4. Update Status Bar (only if processing and not showing an error)
    if (isProcessing && !statusBar.classList.contains('error')) {
        const total = parkingSpaces.length;
        const occupiedCount = Object.values(parkingSpotStatuses).filter(s => s === 'occupied').length;
        const bookedCount = Object.values(parkingSpotStatuses).filter(s => s === 'booked').length;
         const freeCount = total - occupiedCount - bookedCount;
         statusBar.textContent = `Detected: ${freeCount} Free / ${occupiedCount} Occupied / ${bookedCount} Booked`;
         statusBar.classList.add('processing'); // Ensure processing class is set
    }


     // 5. Update Processed Canvas (Optional visualization)
     if (showProcessed) {
         drawProcessedOverlay(occupiedIds, method); // Pass detected IDs and method
     }

     return changed; // Indicate if any status changed
}

// --- Detection Algorithm Implementations ---

async function processWithYOLO(imageData) {
    const occupiedSpaceIds = new Set();
    if (!yoloModel?.loaded) return occupiedSpaceIds; // Already handled in processFrame

    try {
        const detections = await yoloModel.predict(imageData);
        const w = parseInt(spaceWidth.value);
        const h = parseInt(spaceHeight.value);

        // Clear overlay canvas before drawing new detections
        if (showProcessed) processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);

        for (const det of detections) {
            // Optional: Draw raw detection boxes on processed canvas if shown
            if (showProcessed) {
                processedCtx.strokeStyle = 'rgba(255, 0, 255, 0.8)'; // Magenta for YOLO boxes
                processedCtx.lineWidth = 1;
                processedCtx.strokeRect(det.x, det.y, det.width, det.height);
                processedCtx.font = '10px Arial';
                processedCtx.fillStyle = 'magenta';
                processedCtx.fillText(`YOLO (${det.confidence.toFixed(2)})`, det.x, det.y > 10 ? det.y - 2 : det.y + 10);
            }

            // Check overlap with defined parking spaces
            for (const space of parkingSpaces) {
                const overlap = calculateOverlap(
                    space.x, space.y, w, h,
                    det.x, det.y, det.width, det.height
                );
                // Use a threshold for overlap (e.g., 30%) to consider it an occupation
                if (overlap > 0.3) {
                    occupiedSpaceIds.add(space.id);
                    // Optional: Draw indication on matched space on processed canvas
                    if (showProcessed) {
                         processedCtx.fillStyle = 'rgba(255, 0, 255, 0.3)';
                         processedCtx.fillRect(space.x, space.y, w, h);
                    }
                    // Don't break here; a detection might overlap multiple spots slightly
                }
            }
        }
    } catch (error) {
        console.error("YOLO Prediction Error:", error);
        // Error status handled in processFrame
        throw error; // Re-throw to be caught by processFrame
    }
    return occupiedSpaceIds;
}

function processWithTraditional(imageData) {
    const occupiedSpaceIds = new Set();
    if (typeof cv === 'undefined' || !cv.Mat) {
         console.warn("OpenCV not ready for Traditional method.");
         if (!isVideo) updateStatus("OpenCV not ready", false, true); // Show status only for image
         return occupiedSpaceIds;
    }

    const w = parseInt(spaceWidth.value);
    const h = parseInt(spaceHeight.value);
    const threshold = parseInt(thresholdValue.value);
    let src, gray, blurred; // Declare Mats outside try

    try {
        src = cv.matFromImageData(imageData);
        gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0); // Basic noise reduction

        // Clear overlay canvas before drawing
        if (showProcessed) processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);


        for (const space of parkingSpaces) {
            const rect = new cv.Rect(space.x, space.y, w, h);
            // Ensure ROI is within image bounds before creating
            if (space.x >= 0 && space.y >= 0 && space.x + w <= blurred.cols && space.y + h <= blurred.rows) {
                 const roi = blurred.roi(rect);
                 const mean = cv.mean(roi)[0]; // Get the first channel (grayscale) mean
                 roi.delete(); // Clean up ROI mat immediately after use

                 // Simple threshold check (Lower intensity might indicate an object)
                 if (mean < threshold) {
                     occupiedSpaceIds.add(space.id);
                     // Draw on processed canvas if toggled
                     if (showProcessed) {
                          processedCtx.strokeStyle = 'rgba(0, 255, 255, 0.7)'; // Cyan for traditional areas
                          processedCtx.lineWidth = 1;
                          processedCtx.strokeRect(space.x, space.y, w, h);
                          processedCtx.fillStyle = 'rgba(0, 255, 255, 0.3)';
                          processedCtx.fillRect(space.x, space.y, w, h);
                          processedCtx.fillStyle = 'cyan';
                          processedCtx.font = '10px Arial';
                          processedCtx.fillText(`Trad (${mean.toFixed(0)})`, space.x + 2, space.y + 12);
                     }
                 }
            } else {
                 console.warn(`Space ${space.id} ROI is outside canvas bounds.`);
            }
        }
    } catch (error) {
        console.error("OpenCV Error:", error);
        // Error status handled in processFrame
        throw error; // Re-throw to be caught by processFrame
    } finally {
        // Clean up OpenCV Mats in a finally block
        if (src) src.delete();
        if (gray) gray.delete();
        if (blurred) blurred.delete();
    }
    return occupiedSpaceIds;
}

// --- Simulated Placeholder Algorithms ---
async function processWithPOD_Simulated(imageData) {
    // console.log("Simulating POD processing...");
    await new Promise(resolve => setTimeout(resolve, 70 + Math.random() * 50)); // Simulate time
    const occupiedSpaceIds = new Set();
    if (showProcessed) processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height); // Clear overlay

    parkingSpaces.forEach(space => {
        const occupiedChance = (parkingSpotStatuses[space.id] === 'occupied' || parkingSpotStatuses[space.id] === 'booked') ? 0.75 : 0.15;
        if (Math.random() < occupiedChance) {
            occupiedSpaceIds.add(space.id);
            if (showProcessed) {
                processedCtx.fillStyle = 'rgba(0, 255, 0, 0.6)'; // Green for POD
                processedCtx.fillRect(space.x, space.y, parseInt(spaceWidth.value), parseInt(spaceHeight.value));
                processedCtx.fillStyle = 'darkgreen';
                processedCtx.font = '10px Arial';
                processedCtx.fillText(`POD`, space.x + 2, space.y + 12);
            }
        }
    });
    return occupiedSpaceIds;
}

async function processWithOctDept_Simulated(imageData) {
    // console.log("Simulating Oct Dept processing...");
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 80)); // Simulate time
    const occupiedSpaceIds = new Set();
    if (showProcessed) processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height); // Clear overlay

    parkingSpaces.forEach(space => {
        const occupiedChance = (parkingSpotStatuses[space.id] === 'occupied' || parkingSpotStatuses[space.id] === 'booked') ? 0.8 : 0.2;
        if (Math.random() < occupiedChance) {
            occupiedSpaceIds.add(space.id);
            if (showProcessed) {
                processedCtx.fillStyle = 'rgba(255, 165, 0, 0.6)'; // Orange for Oct Dept
                processedCtx.fillRect(space.x, space.y, parseInt(spaceWidth.value), parseInt(spaceHeight.value));
                 processedCtx.fillStyle = 'darkorange';
                 processedCtx.font = '10px Arial';
                 processedCtx.fillText(`OctD`, space.x + 2, space.y + 12);
            }
        }
    });
    return occupiedSpaceIds;
}

async function processWithPakStra_Simulated(imageData) {
    // console.log("Simulating PakStra processing...");
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 40)); // Simulate time (faster)
    const occupiedSpaceIds = new Set();
    if (showProcessed) processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height); // Clear overlay

    parkingSpaces.forEach(space => {
        const occupiedChance = (parkingSpotStatuses[space.id] === 'occupied' || parkingSpotStatuses[space.id] === 'booked') ? 0.7 : 0.25;
        if (Math.random() < occupiedChance) {
            occupiedSpaceIds.add(space.id);
            if (showProcessed) {
                processedCtx.fillStyle = 'rgba(128, 0, 128, 0.6)'; // Purple for PakStra
                processedCtx.fillRect(space.x, space.y, parseInt(spaceWidth.value), parseInt(spaceHeight.value));
                 processedCtx.fillStyle = 'indigo';
                 processedCtx.font = '10px Arial';
                 processedCtx.fillText(`PakS`, space.x + 2, space.y + 12);
            }
        }
    });
    return occupiedSpaceIds;
}


// --- Utility Functions ---
function calculateOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
     // Calculate intersection rectangle coordinates
     const ix1 = Math.max(x1, x2);
     const iy1 = Math.max(y1, y2);
     const ix2 = Math.min(x1 + w1, x2 + w2);
     const iy2 = Math.min(y1 + h1, y2 + h2);

     // Calculate intersection area
     const intersectionArea = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);

     // Calculate area of the parking space
     const area1 = w1 * h1;

     // Return overlap ratio relative to the parking space area
     return area1 > 0 ? intersectionArea / area1 : 0;
 }

 function drawProcessedOverlay(occupiedIds, method) {
      // This function is now primarily handled within each processWith... method
      // This function itself doesn't need to draw much, maybe just a label
      processedCtx.font = 'bold 12px Arial';
      processedCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      const text = `Overlay: ${method}`;
      processedCtx.fillText(text, 5, processedCanvas.height - 5);
 }


function toggleProcessedView() {
    showProcessed = !showProcessed;
    processedCanvas.classList.toggle('hidden', !showProcessed);
     toggleBtn.textContent = showProcessed ? 'Hide Overlay' : 'Show Overlay';
     toggleBtn.classList.toggle('btn-warning'); // Use warning for 'Show' state
     toggleBtn.classList.toggle('btn-info'); // Use info for 'Hide' state

    if (!showProcessed) {
        processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
    } else if (mediaElement && !isProcessing) { // Only force redraw if not already processing
         // If turning on when idle, force a single processing run to draw the overlay based on current state
         console.log("Forcing overlay redraw based on current state.");
         processFrame().catch(console.error); // Run processing logic just to draw overlay
    } else if (showProcessed && isProcessing) {
        // If turning on WHILE processing, the next processFrame call will handle drawing.
        // If needed, could clear here to avoid brief old overlay:
        processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
    }
}


// --- Parking Space Management (Canvas Interaction) ---
function handleCanvasClick(e) {
    if (!mediaElement) return; // Only add spots if media is loaded

    const rect = mainCanvas.getBoundingClientRect();
     // Calculate scale based on display vs internal size
    const scaleX = mainCanvas.width / rect.width;
    const scaleY = mainCanvas.height / rect.height;

    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    const w = parseInt(spaceWidth.value);
    const h = parseInt(spaceHeight.value);

    // Prevent adding spots outside canvas bounds
     if (x < 0 || y < 0 || x + w > mainCanvas.width || y + h > mainCanvas.height) {
          console.warn("Attempted to add spot outside canvas bounds.");
          return;
     }

    // Find the highest existing ID number
    let maxId = 0;
    parkingSpaces.forEach(s => {
        const idNum = parseInt(s.id.split('-')[1]);
        if (!isNaN(idNum) && idNum > maxId) { // Ensure idNum is a valid number
            maxId = idNum;
        }
    });
    const newSpaceId = `space-${maxId + 1}`;

    // Add the new space with DEFAULT size 'M'
    parkingSpaces.push({ id: newSpaceId, x: x, y: y, sizeCategory: 'M' });
    parkingSpotStatuses[newSpaceId] = 'free'; // Initialize status

    saveParkingSpaces();
    updateParkingGrid(); // Update grid UI
    updateDashboardStats();
     updateBookingDropdown();
    drawFrame(); // Redraw canvas with the new spot
    console.log(`Added Spot: ${newSpaceId} (Size: M) at (${x}, ${y})`);
}

function handleRightClick(e) {
    e.preventDefault(); // Prevent browser context menu
    if (!mediaElement || parkingSpaces.length === 0) return;

    const rect = mainCanvas.getBoundingClientRect();
     const scaleX = mainCanvas.width / rect.width;
     const scaleY = mainCanvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const w = parseInt(spaceWidth.value);
    const h = parseInt(spaceHeight.value);
    let removed = false;
    let spotToRemoveIndex = -1;

    // Find the spot that contains the click coordinates
    for (let i = parkingSpaces.length - 1; i >= 0; i--) {
        const space = parkingSpaces[i];
        if (clickX >= space.x && clickX <= space.x + w &&
            clickY >= space.y && clickY <= space.y + h)
        {
            spotToRemoveIndex = i;
            break; // Found the spot
        }
    }

    if (spotToRemoveIndex !== -1) {
         const spaceToRemove = parkingSpaces[spotToRemoveIndex];
         console.log(`Attempting to remove Spot: ${spaceToRemove.id}`);

         // Check if spot has an active booking
         const activeBooking = bookings.find(b => b.spaceId === spaceToRemove.id);
         if (activeBooking) {
              if (!confirm(`Spot ${spaceToRemove.id} has an active booking for ${activeBooking.vehicle}. Removing the spot will also cancel this booking. Continue?`)) {
                  return; // Stop if user cancels
              }
              // Cancel the booking associated with this spot (move to history)
              cancelBooking(activeBooking.bookingId, false); // Call cancelBooking internally without confirmation
         }

        // Remove the spot status and the spot itself
        delete parkingSpotStatuses[spaceToRemove.id];
        parkingSpaces.splice(spotToRemoveIndex, 1);
        removed = true;
        console.log(`Removed Spot: ${spaceToRemove.id}`);
    }


    if (removed) {
        saveParkingSpaces();
         saveBookings(); // Save potentially modified bookings
        updateParkingGrid();
        updateDashboardStats();
         updateBookingDropdown();
        drawFrame(); // Redraw canvas without the spot
    }
}

function resetParkingSpaces() {
    if (confirm('Are you sure you want to remove ALL parking spots and cancel ALL current bookings? This cannot be undone.')) {
        parkingSpaces = [];
        parkingSpotStatuses = {};
         // Move all active bookings to history before clearing
         bookings.forEach(booking => {
             bookingHistory.push(booking);
         });
         bookings = []; // Clear active bookings

        saveParkingSpaces();
         saveBookings(); // Save cleared bookings and updated history

        updateParkingGrid();
        updateDashboardStats();
         updateBookingDropdown();
         updateBookingLists(); // Clear booking lists UI

         if (mediaElement) {
             drawFrame(); // Redraw canvas without any spots
         }
        console.log("All parking spots cleared. Active bookings moved to history.");
        updateStatus("All spots cleared.");
    }
}

function updateSpaceDimensions() {
     // Redraw canvas immediately when dimensions change to reflect in outlines
     if (mediaElement) {
         drawFrame();
     }
     // Could potentially re-run detection if dimensions change significantly,
     // but usually better to let user trigger processing manually.
 }


// --- Dashboard & Grid UI ---
function updateDashboardStats() {
    const total = parkingSpaces.length;
    const occupiedCount = Object.values(parkingSpotStatuses).filter(s => s === 'occupied').length;
    const bookedCount = Object.values(parkingSpotStatuses).filter(s => s === 'booked').length;
    const freeCount = total - occupiedCount - bookedCount;

    // Calculate suitable available spots based on selected car size
    const currentCarSize = carSizeSelect.value;
    const suitableCount = parkingSpaces.filter(space =>
        parkingSpotStatuses[space.id] === 'free' && isSpotSuitable(space, currentCarSize)
    ).length;

    totalSpacesElement.textContent = total;
    availableSpacesElement.textContent = freeCount;
    occupiedSpacesElement.textContent = occupiedCount;
    bookedSpacesElement.textContent = bookedCount;
    suitableSpacesElement.textContent = suitableCount; // Update new stat
}

function updateParkingGrid() {
     parkingGrid.innerHTML = ''; // Clear existing grid

     if (parkingSpaces.length === 0) {
         parkingGrid.innerHTML = '<em style="color: #888; font-size: 0.9rem; grid-column: 1 / -1;">Upload media and click on the preview to define parking spots.</em>';
         return;
     }

     // Sort spaces by ID number for consistent order
     const sortedSpaces = [...parkingSpaces].sort((a, b) => {
         const idA = parseInt(a.id.split('-')[1] || 0);
         const idB = parseInt(b.id.split('-')[1] || 0);
         return idA - idB;
     });

     const currentCarSize = carSizeSelect.value; // Get selected car size

     sortedSpaces.forEach(space => {
         const spotElement = document.createElement('div');
         const status = parkingSpotStatuses[space.id] || 'free'; // Default to free if status missing
         const isSuitable = status === 'free' && isSpotSuitable(space, currentCarSize);

         spotElement.classList.add('parking-spot');
         spotElement.dataset.id = space.id; // Link element to space data

         // Add status class and animate changes
         const previousStatus = spotElement.dataset.status;
         if (previousStatus && previousStatus !== status) {
             spotElement.classList.add('animate-status-change');
             spotElement.addEventListener('animationend', () => {
                 spotElement.classList.remove('animate-status-change');
             }, { once: true });
         }
         // Remove previous status classes before adding new one
         spotElement.classList.remove('free', 'occupied', 'booked', 'suitable');
         spotElement.classList.add(status); // Add current status class (free, occupied, booked)
         if (isSuitable) {
             spotElement.classList.add('suitable'); // Add suitable class if applicable
         }
         spotElement.dataset.status = status; // Store current status for animation check

         // Make free spots appear clickable (visual cue)
         spotElement.classList.toggle('can-book', status === 'free');


         // Content of the spot div
          const spotLabel = document.createElement('span');
          spotLabel.className = 'spot-label';
          // Show "Suitable" if free and suitable, otherwise show status
          spotLabel.textContent = isSuitable ? 'Suitable' : (status.charAt(0).toUpperCase() + status.slice(1));

          const spotId = document.createElement('span');
          spotId.className = 'spot-id';
          spotId.textContent = `${space.id.replace('space-','S')}${space.sizeCategory}`; // e.g., S1M

         spotElement.appendChild(spotLabel);
         spotElement.appendChild(spotId);

         parkingGrid.appendChild(spotElement);
     });
 }

// --- Booking Management ---

// Helper function to check spot suitability
function isSpotSuitable(space, carSize) {
    if (!space || !carSize || !space.sizeCategory) return false;
    const allowedSpotSizes = CAR_SIZE_COMPATIBILITY[carSize];
    return allowedSpotSizes ? allowedSpotSizes.includes(space.sizeCategory) : false;
}

function updateBookingDropdown() {
    parkingSpotSelect.innerHTML = ''; // Clear existing options
    const currentCarSize = carSizeSelect.value;

    const suitableFreeSpaces = parkingSpaces.filter(space =>
        parkingSpotStatuses[space.id] === 'free' && isSpotSuitable(space, currentCarSize)
    );

     // Sort by ID number
     suitableFreeSpaces.sort((a, b) => {
         const idA = parseInt(a.id.split('-')[1] || 0);
         const idB = parseInt(b.id.split('-')[1] || 0);
         return idA - idB;
     });

    if (suitableFreeSpaces.length === 0) {
        parkingSpotSelect.innerHTML = '<option value="">-- No Suitable Spots Available --</option>';
        parkingSpotSelect.disabled = true;
    } else {
        parkingSpotSelect.innerHTML = '<option value="">-- Select Suitable Spot --</option>';
        suitableFreeSpaces.forEach(space => {
            const option = document.createElement('option');
            option.value = space.id;
            option.textContent = `${space.id} (Size: ${space.sizeCategory}, Available)`;
            parkingSpotSelect.appendChild(option);
        });
        parkingSpotSelect.disabled = false;
    }
     // Also update the dashboard stats to reflect suitable count for the *current* car size
     updateDashboardStats();
     // Also update the grid highlighting
     updateParkingGrid();
}

 function displayBookingMessage(message, isError = false) {
     bookingMessage.textContent = message;
     bookingMessage.style.color = isError ? 'var(--danger)' : 'var(--success)';
     // Clear message after a few seconds
     setTimeout(() => {
         if (bookingMessage.textContent === message) { // Avoid clearing newer messages
             bookingMessage.textContent = '';
         }
     }, 4000);
 }


function handleBookingAttempt() {
    const selectedSpotId = parkingSpotSelect.value;
    const duration = parseInt(durationInput.value);
    const vehicle = vehicleNumberInput.value.trim().toUpperCase();
    const selectedCarSize = carSizeSelect.value;

    // Validation
    if (!selectedSpotId) {
        displayBookingMessage('Please select an available and suitable parking spot.', true);
        return;
    }
    if (isNaN(duration) || duration < 1 || duration > 24) {
         displayBookingMessage('Please enter a valid duration (1-24 hours).', true);
         return;
    }
    if (!vehicle) {
        displayBookingMessage('Please enter the vehicle number.', true);
        return;
    }
     // Basic vehicle number format check (example - adjust regex for specific country if needed)
     if (!/^[A-Z]{1,3}[0-9]{1,4}[A-Z]{0,3}$/.test(vehicle) && !/^[A-Z]{2}[ -]?[0-9]{2}[ -]?[A-Z]{1,2}[ -]?[0-9]{1,4}$/.test(vehicle)) {
          displayBookingMessage('Invalid vehicle number format (e.g., AB12CD3456 or MP-20-AB-1234).', true);
          return;
     }

     // Double-check: Is the spot *still* free and suitable? (Mitigates race conditions)
     const spot = parkingSpaces.find(s => s.id === selectedSpotId);
     if (!spot || parkingSpotStatuses[selectedSpotId] !== 'free' || !isSpotSuitable(spot, selectedCarSize)) {
          displayBookingMessage(`Spot ${selectedSpotId} is no longer available or suitable for a ${selectedCarSize} car. Please select another.`, true);
          updateBookingDropdown(); // Refresh dropdown
          return;
     }

     // Create booking
     const newBooking = {
         bookingId: `B${Date.now()}`, // Simple unique ID
         spaceId: selectedSpotId,
         vehicle: vehicle,
         startTime: Date.now(),
         durationHours: duration
     };

     // Add to bookings and update state
     bookings.push(newBooking);
     parkingSpotStatuses[selectedSpotId] = 'booked';

     saveBookings(); // Saves, updates lists, grid, dashboard, dropdown

     displayBookingMessage(`Spot ${selectedSpotId} booked successfully for ${vehicle}.`, false);

     // Clear form
     // parkingSpotSelect.value = ''; // Dropdown updates automatically via saveBookings -> updateBookingDropdown
     durationInput.value = 1;
     vehicleNumberInput.value = '';
}

// Modified to accept an optional confirmation bypass flag
function cancelBooking(bookingId, showConfirmation = true) {
     const bookingIndex = bookings.findIndex(b => b.bookingId === bookingId);
     if (bookingIndex === -1) {
          console.warn(`Booking ID ${bookingId} not found for cancellation.`);
          return; // Booking doesn't exist or already cancelled
     }

     const booking = bookings[bookingIndex];
     const spaceId = booking.spaceId;

     // Confirmation step (optional)
     if (showConfirmation && !confirm(`Are you sure you want to cancel the booking for ${booking.vehicle} in spot ${spaceId}?`)) {
         return; // User cancelled the cancellation
     }

     // Move to history
     bookingHistory.push(booking);
     // Remove from active bookings
     bookings.splice(bookingIndex, 1);

     // Update spot status: Only mark as 'free' if it exists and was 'booked'.
     // If detection made it 'occupied' while booked, leave it as 'occupied'.
     if (parkingSpotStatuses[spaceId] === 'booked') {
          parkingSpotStatuses[spaceId] = 'free'; // Mark as free
     } else {
         console.log(`Spot ${spaceId} status was not 'booked' (${parkingSpotStatuses[spaceId]}) during cancellation. Status remains unchanged.`);
     }

     saveBookings(); // Saves, updates lists, grid, dashboard, dropdown

     console.log(`Booking ${bookingId} for spot ${spaceId} cancelled and moved to history.`);
      if (showConfirmation) { // Only show message if user initiated
           displayBookingMessage(`Booking for ${spaceId} cancelled.`, false);
      }
 }

 function clearBookingHistory() {
     if (bookingHistory.length === 0) {
         displayBookingMessage("Booking history is already empty.", true);
         return;
     }
     if (confirm("Are you sure you want to clear the entire booking history? This cannot be undone.")) {
         bookingHistory = [];
         saveBookings(); // Saves empty history, updates UI
         console.log("Booking history cleared.");
         displayBookingMessage("Booking history cleared.", false);
     }
 }


function updateBookingLists() {
     // Current Bookings
     currentBookingsList.innerHTML = ''; // Clear list
     if (bookings.length === 0) {
         currentBookingsList.innerHTML = '<li class="no-bookings">No current bookings.</li>';
     } else {
          // Sort by start time, oldest first
          const sortedBookings = [...bookings].sort((a, b) => a.startTime - b.startTime);
          sortedBookings.forEach(booking => {
              const li = document.createElement('li');
              li.classList.add('booking-item');
              const endTime = new Date(booking.startTime + booking.durationHours * 60 * 60 * 1000);
              const isExpired = endTime < Date.now(); // Check if booking has expired

              li.innerHTML = `
                   <div>
                       <span>${booking.spaceId}: ${booking.vehicle}</span>
                       <small style="${isExpired ? 'color: var(--danger);' : ''}">
                           (Ends: ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${isExpired ? ' - Expired' : ''})
                       </small>
                   </div>
                   <button class="btn btn-danger btn-small cancel-booking-btn" data-booking-id="${booking.bookingId}" title="Cancel Booking">Cancel</button>
              `;
              currentBookingsList.appendChild(li);
          });
     }

     // Booking History
     bookingHistoryList.innerHTML = ''; // Clear list
     if (bookingHistory.length === 0) {
         bookingHistoryList.innerHTML = '<li class="no-bookings">No booking history yet.</li>';
     } else {
          // Sort by start time, newest first
          const sortedHistory = [...bookingHistory].sort((a, b) => b.startTime - a.startTime);
          sortedHistory.forEach(booking => {
              const li = document.createElement('li');
              li.classList.add('booking-item');
               const startTime = new Date(booking.startTime);
               const endTime = new Date(booking.startTime + booking.durationHours * 60 * 60 * 1000);
              li.innerHTML = `
                  <span>${booking.spaceId}: ${booking.vehicle}</span>
                  <small>
                    (${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </small>
              `; // No cancel button for history
              bookingHistoryList.appendChild(li);
          });
     }
      clearHistoryBtn.style.display = bookingHistory.length > 0 ? 'inline-block' : 'none';
 }

// --- Start the application ---
window.onload = () => {
     // Check if OpenCV is ready using a timer loop
     const checkCvReady = setInterval(() => {
         if (typeof cv !== 'undefined' && cv.onRuntimeInitialized) {
              clearInterval(checkCvReady);
              console.log("OpenCV Runtime Initialized.");
              cv.onRuntimeInitialized = init; // Start after OpenCV is ready
         } else if (typeof cv !== 'undefined') {
             // OpenCV object exists but not initialized yet
             console.log("Waiting for OpenCV initialization...");
         } else {
             // OpenCV script likely hasn't loaded yet
             console.log("Waiting for OpenCV script to load...");
         }
     }, 100); // Check every 100ms

     // Fallback if OpenCV doesn't load/initialize after a timeout
     setTimeout(() => {
         if (typeof cv === 'undefined' || !cv.onRuntimeInitialized) {
             clearInterval(checkCvReady);
             console.warn("OpenCV failed to initialize after timeout. Initializing without it. Traditional method will be unavailable.");
             init(); // Initialize anyway
         }
     }, 5000); // 5-second timeout
};
