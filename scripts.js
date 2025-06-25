let appState = {
    decisionTree: null,
    currentNodeId: 'start',
    pathNodes: ['start'],
    selectedOptions: {}, // Track which option was selected for each node
    nodeHistory: [], // Track the history of visited nodes in sequence
    collapsedBranches: {}, // Track collapsed branches by node ID
    treeExpandedState: true,
    pdfLibraryLoaded: false,
    processingStep: 0,
    extractedChunks: []
};

// DOM elements
const elements = {
    // Sections
    uploadSection: document.getElementById('upload-section'),
    exploreSection: document.getElementById('explore-section'),
    // Tabs
    uploadToggle: document.getElementById('upload-toggle'),
    exploreToggle: document.getElementById('explore-toggle'),
    // API Config
    apiConfigToggle: document.getElementById('toggle-api-config'),
    apiConfigBody: document.getElementById('api-config-body'),
    apiKey: document.getElementById('api-key'),
    extractionPrompt: document.getElementById('extraction-prompt'),
    mergePrompt: document.getElementById('merge-prompt'),
    schemaEditor: document.getElementById('schema-editor'),
    // Upload elements
    pdfFileInput: document.getElementById('pdfFileInput'),
    jsonInput: document.getElementById('jsonInput'),
    processBtn: document.getElementById('processBtn'),
    pdfLibraryStatus: document.getElementById('pdf-library-status'),
    // Processing steps
    step1: document.getElementById('step-1'),
    step2: document.getElementById('step-2'),
    step3: document.getElementById('step-3'),
    step4: document.getElementById('step-4'),
    // Explorer elements
    restartBtn: document.getElementById('restart-btn'),
    exportJsonBtn: document.getElementById('export-json-btn'),
    // Tree visualization
    treeVisualization: document.getElementById('tree-visualization'),
    expandTreeBtn: document.getElementById('expand-tree-btn'),
    collapseTreeBtn: document.getElementById('collapse-tree-btn'),
    // Overlay
    processingOverlay: document.getElementById('processing-overlay'),
    processingStatus: document.getElementById('processing-status'),
    processingSubstatus: document.getElementById('processing-substatus'),
    processingProgressBar: document.getElementById('processing-progress-bar'),
    chunkPreview: document.getElementById('chunk-preview')
};

function init() {
    setupEventListeners();
    configurePdfLibrary();
    // Set default schema
    elements.schemaEditor.value = `{
  "id": "unique identifier for the node",
  "category": "optional category for the node",
  "question": "the decision question",
  "text": "alternative to question for info nodes",
  "type": "one of: decision, yes_no_n_a, info, goal, action, rule, conclusion",
  "next": [
    {
      "on": "condition or option text",
      "id": "id of the next node"
    }
  ]
}`;
    // Set default prompts
    elements.extractionPrompt.value = "Read the following content and extract any decision rules, checklist items, or informational prompts into a structured JSON format.";
    elements.mergePrompt.value = "The following are arrays of decision nodes extracted from multiple PDF sections. Your task is to merge all nodes into a single clean array that: 1) Creates a start node with id='start' that connects to the logical first node, 2) Removes duplicates, 3) Ensures unique ids, 4) Normalizes field casing, 5) Resolves follow-up sequences, 6) Ensures every object follows the schema";
}

// Configure PDF.js once loaded
function configurePdfLibrary() {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
    const workerScript = document.createElement('script');
    workerScript.src = pdfjsLib.GlobalWorkerOptions.workerSrc;
    workerScript.onload = function() {
        appState.pdfLibraryLoaded = true;
        elements.pdfLibraryStatus.className = 'alert alert-success';
        elements.pdfLibraryStatus.textContent = 'PDF processing library loaded successfully';
    };
    workerScript.onerror = () => handlePdfLibraryFailure('Worker script failed to load');
    document.head.appendChild(workerScript);
}

// Set up event listeners
function setupEventListeners() {
    // Section navigation
    elements.uploadToggle.addEventListener('click', () => showSection('upload'));
    elements.exploreToggle.addEventListener('click', () => showSection('explore'));
    // Config toggle
    elements.apiConfigToggle.addEventListener('click', () => {
        elements.apiConfigBody.classList.toggle('show');
    });
    // Upload actions
    elements.processBtn.addEventListener('click', processPlaybook);
    elements.pdfFileInput.addEventListener('change', handleFileSelect);
    // Explorer actions
    elements.restartBtn.addEventListener('click', restartExploration);
    elements.exportJsonBtn.addEventListener('click', exportJson);
    // Tree visualization controls
    elements.expandTreeBtn.addEventListener('click', expandTree);
    elements.collapseTreeBtn.addEventListener('click', collapseTree);
    // Setup drag and drop for PDF
    const dropArea = document.getElementById('pdf-drop-area');
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, document.getElementById('pdf-drop-area').classList.add('bg-light'), false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, document.getElementById('pdf-drop-area').classList.remove('bg-light'), false);
    });
    dropArea.addEventListener('drop', handleDrop, false);
}

// Update processing step
function updateProcessingStep(step) {
    appState.processingStep = step;
    // Reset all steps
    elements.step1.classList.remove('active', 'completed');
    elements.step2.classList.remove('active', 'completed');
    elements.step3.classList.remove('active', 'completed');
    elements.step4.classList.remove('active', 'completed');
    // Mark completed steps
    if (step > 1) elements.step1.classList.add('completed');
    if (step > 2) elements.step2.classList.add('completed');
    if (step > 3) elements.step3.classList.add('completed');
    if (step > 4) elements.step4.classList.add('completed');
    // Mark active step
    if (step === 1) elements.step1.classList.add('active');
    if (step === 2) elements.step2.classList.add('active');
    if (step === 3) elements.step3.classList.add('active');
    if (step === 4) elements.step4.classList.add('active');
}

// Update progress bar
function updateProgress(percent) {
    elements.processingProgressBar.style.width = `${percent}%`;
    elements.processingProgressBar.setAttribute('aria-valuenow', percent);
}

// Prevent default drag and drop behavior
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Handle file drop
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (!appState.pdfLibraryLoaded) {
        return;
    }
    if (files.length > 0 && files[0].type === 'application/pdf') {
        elements.pdfFileInput.files = files;
    }
}

// Handle file selection
function handleFileSelect(e) {
    const files = e.target.files;
}

// Show the specified section
function showSection(section) {
    elements.uploadSection.style.display = section === 'upload' ? 'block' : 'none';
    elements.exploreSection.style.display = section === 'explore' ? 'block' : 'none';
    elements.uploadToggle.classList.toggle('active', section === 'upload');
    elements.exploreToggle.classList.toggle('active', section === 'explore');
}

// Process the playbook
async function processPlaybook() {
    try {
        showProcessingOverlay('Initializing processing...');
        updateProgress(0);
        let decisionTree;
        // Check which tab is active
        const activeTab = document.querySelector('#uploadTabs .nav-link.active').id;
        switch (activeTab) {
            case 'pdf-tab':
                if (!appState.pdfLibraryLoaded) {
                    throw new Error('PDF processing is unavailable. Please use Text or JSON input instead.');
                }
                if (!elements.pdfFileInput.files.length) {
                    throw new Error('Please select a PDF file');
                }
                decisionTree = await processPDF(elements.pdfFileInput.files[0]);
                break;
            case 'json-tab':
                if (!elements.jsonInput.value.trim()) {
                    throw new Error('Please enter JSON content');
                }
                decisionTree = JSON.parse(elements.jsonInput.value);
                break;
        }
        // Store the decision tree in app state
        appState.decisionTree = decisionTree;
        
        // Initialize exploration
        initializeExploration();
        
        // Switch to explore section
        showSection('explore');
    } catch (error) {
        console.error(error);
        alert('Error: ' + error.message);
    } finally {
        hideProcessingOverlay();
        updateProcessingStep(0);
        updateProgress(0);
        elements.chunkPreview.style.display = 'none';
    }
}

// Process PDF file
async function processPDF(file) {
    if (!appState.pdfLibraryLoaded) {
        throw new Error('PDF processing library is not available');
    }
    // Reset state
    appState.extractedChunks = [];
    try {
        // Step 1: Split PDF into chunks
        updateProcessingStatus('Step 1: Splitting PDF into chunks');
        updateProcessingStep(1);
        updateProgress(10);
        const pdfChunks = await splitPdfIntoChunks(file);
        // Check if pdfChunks is valid
        if (!pdfChunks || !Array.isArray(pdfChunks) || pdfChunks.length === 0) {
            throw new Error('Failed to process PDF. The file may be invalid or corrupted.');
        }
        updateProgress(25);
        // Step 2: Convert each chunk to PNG
        updateProcessingStatus('Step 2: Converting chunks to PNG images');
        updateProcessingStep(2);
        const pngImages = await convertChunksToPng(pdfChunks);
        if (!pngImages || pngImages.length === 0) {
            throw new Error('Failed to convert PDF pages to images.');
        }
        updateProgress(40);
        // Step 3: Extract JSON using OpenAI Vision
        updateProcessingStatus('Step 3: Extracting structured JSON from images');
        updateProcessingStep(3);
        const extractedNodes = await extractJsonFromImages(pngImages);
        if (!extractedNodes || extractedNodes.length === 0) {
            throw new Error('Failed to extract data from images. No decision tree content was found.');
        }
        updateProgress(75);
        // Step 4: Merge results
        updateProcessingStatus('Step 4: Merging extracted nodes');
        updateProcessingStep(4);
        const finalNodes = await mergeExtractedNodes(extractedNodes);
        if (!finalNodes || !Array.isArray(finalNodes) || finalNodes.length === 0) {
            throw new Error('Failed to create a valid decision tree from the extracted data.');
        }
        // Create a decision tree object with the nodes array
        const finalTree = {
            nodes: finalNodes
        };
        updateProgress(100);
        return finalTree;
    } catch (error) {
        // Catch any errors within the processPDF function and throw them to be handled by the caller
        throw error;
    }
}

// Split PDF into chunks of ≤ 2 pages
async function splitPdfIntoChunks(file) {
    try {
        // Load the PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const numPages = pdf.numPages;
        elements.processingSubstatus.textContent = `Loaded PDF with ${numPages} pages`;
        // Calculate number of chunks (2 pages per chunk)
        const numChunks = Math.ceil(numPages / 2);
        const chunks = [];
        // Process each chunk
        for (let i = 0; i < numChunks; i++) {
            const startPage = i * 2 + 1;
            const endPage = Math.min(startPage + 1, numPages);
            elements.processingSubstatus.textContent = `Processing chunk ${i+1}/${numChunks} (pages ${startPage}-${endPage})`;
            updateProgress(10 + (15 * i / numChunks));
            // Create chunk info
            const chunk = {
                id: `chunk-${i+1}`,
                startPage,
                endPage,
                pages: []
            };
            // Get each page in the chunk
            for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                const page = await pdf.getPage(pageNum);
                chunk.pages.push(page);
            }
            chunks.push(chunk);
        }
        return chunks;
    } catch (error) {
        // Return an empty array instead of throwing
        return [];
    }
}

// Convert PDF chunks to PNG images
async function convertChunksToPng(pdfChunks) {
    const images = [];
    // Process each chunk
    for (let i = 0; i < pdfChunks.length; i++) {
        const chunk = pdfChunks[i];
        elements.processingSubstatus.textContent = `Converting chunk ${i+1}/${pdfChunks.length} to PNG`;
        updateProgress(25 + (15 * i / pdfChunks.length));
        try {
            // Convert each page in the chunk to an image
            for (let j = 0; j < chunk.pages.length; j++) {
                const page = chunk.pages[j];
                const pageNum = chunk.startPage + j;
                // Get page dimensions
                const viewport = page.getViewport({ scale: 1.5 }); // Higher scale for better quality
                // Create canvas for rendering
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                // Render page to canvas
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
                // Convert canvas to PNG
                const imageData = canvas.toDataURL('image/png');
                // Display preview of current chunk
                if (j === 0) {
                    elements.chunkPreview.src = imageData;
                    elements.chunkPreview.style.display = 'block';
                }
                images.push({
                    chunkId: chunk.id,
                    pageNum,
                    imageData
                });
            }
        } catch (error) {
            // Continue with the next chunk
        }
    }
    return images;
}

// Extract JSON from images using OpenAI Vision API
async function extractJsonFromImages(images) {
    const extractedData = [];
    // Set up for progress tracking
    const totalImages = images.length;
    let processedImages = 0;
    // Process each image in batches
    const batchSize = 3; // Process 3 images at a time
    for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        // Update status
        elements.processingSubstatus.textContent = `Processing images ${i+1}-${Math.min(i+batchSize, totalImages)} of ${totalImages}`;
        // Process batch in parallel
        const batchPromises = batch.map(async (image) => {
            try {
                // Show current image preview
                elements.chunkPreview.src = image.imageData;
                // Extract JSON from image using OpenAI Vision API
                const extractedJson = await callOpenAIVisionAPI(image);
                // Increment processed count and update progress
                processedImages++;
                updateProgress(40 + (35 * processedImages / totalImages));
                if (extractedJson && Object.keys(extractedJson).length > 0) {
                    extractedData.push({
                        source: image.chunkId,
                        pageNum: image.pageNum,
                        data: extractedJson
                    });
                }
                return extractedJson;
            } catch (error) {
                return null;
            }
        });
        // Wait for all images in this batch to be processed
        await Promise.all(batchPromises);
    }
    return extractedData;
}

// Call OpenAI Vision API
async function callOpenAIVisionAPI(image) {
    const apiKey = document.getElementById('api-key').value;
    const schema = document.getElementById('schema-editor').value;
    const extractionPrompt = document.getElementById('extraction-prompt').value;
    if (!apiKey) {
        throw new Error('API key is required for Vision API calls');
    }
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'anthropic/claude-sonnet-4',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert in converting structured regulatory or procedural content into machine-readable decision nodes.Your response must be a single JSON array of objects.Each object must strictly follow the schema below: ${schema}`
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: extractionPrompt },
                            {
                                type: 'image_url',
                                image_url: { url: image.imageData }
                            }
                        ]
                    }
                ]
            })
        });
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }
        // Parse JSON from response
        const content = data.choices[0].message.content;
        try {
            // Extract JSON from the response text
            const jsonMatch = content.match(/```json([\s\S]*?)```/) || content.match(/```([\s\S]*?)```/) || [null, content];
            const jsonText = jsonMatch[1] || content;
            return JSON.parse(jsonText.trim());
        } catch (e) {
            throw new Error(`Failed to parse JSON from API response: ${e.message}`);
        }
    } catch (error) {
        throw error;
    }
}

// Merge extracted nodes
async function mergeExtractedNodes(extractedNodes) {
    // Update status
    elements.processingSubstatus.textContent = 'Preparing to merge extracted nodes';
    const apiKey = document.getElementById('api-key').value;
    // Map phase: collect all nodes
    let allNodes = [];
    const nodeMap = {};
    let nodeCounter = 0;
    // Collect all nodes from extracted data
    extractedNodes.forEach(extracted => {
        if (Array.isArray(extracted.data)) {
            nodeCounter += extracted.data.length;
            extracted.data.forEach(node => {
                const nodeWithSource = {
                    ...node,
                    _source: {
                        chunkId: extracted.source,
                        pageNum: extracted.pageNum
                    }
                };
                allNodes.push(nodeWithSource);
                nodeMap[node.id] = nodeWithSource;
            });
        }
    });
    elements.processingSubstatus.textContent = `Collected ${nodeCounter} nodes from all chunks`;
    // Try to use OpenAI for merging if API key is provided
    if (apiKey) {
        try {
            elements.processingSubstatus.textContent = 'Calling OpenAI API to merge nodes';
            updateProgress(80);
            const mergePrompt = document.getElementById('merge-prompt').value;
            const schema = document.getElementById('schema-editor').value;
            const apiKey = document.getElementById('api-key').value;
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'anthropic/claude-sonnet-4',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a decision tree merging expert. Merge multiple partial decision trees into a single coherent structure.
                            Important requirements:
                            1. Create a 'start' node with id='start' that connects to the logical first node in the decision flow
                            2. Each object must strictly follow the schema below: ${schema}
                            3. The node type field should accurately represent the kind of decision or information
                            4. Generate unique IDs for all nodes to prevent conflicts
`
                        },
                        {
                            role: 'user',
                            content: `${mergePrompt}\n\nHere are the extracted nodes to merge:\n\n${JSON.stringify(allNodes, null, 2)}`
                        }
                    ]
                })
            });
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error.message);
            }
            // Parse JSON from response
            const content = data.choices[0].message.content;
            try {
                const jsonMatch = content.match(/```json([\s\S]*?)```/) || content.match(/```([\s\S]*?)```/) || [null, content];
                const jsonText = jsonMatch[1] || content;
                const mergedNodes = JSON.parse(jsonText.trim());
                updateProgress(95);
                return mergedNodes;
            } catch (e) {
                throw new Error(`Failed to parse JSON from API response: ${e.message}`);
            }
        } catch (error) {
            // Fall back to local merge on error
            console.error("Error merging with OpenAI:", error);
        }
    }
    // Local merge fallback
    return allNodes;
}

// Initialize exploration
function initializeExploration() {
    // Reset state
    appState.currentNodeId = 'start';
    appState.pathNodes = ['start'];
    appState.selectedOptions = {}; // Reset selected options
    appState.nodeHistory = ['start']; // Reset node history
    appState.collapsedBranches = {}; // Reset collapsed branches
    
    // Initialize tree visualization
    renderTreeVisualization();
    
    // Set default expanded state
    appState.treeExpandedState = true;
}

// Select an option and move to the next node
function selectOption(option, sourceNodeId = null) {
    // Get the nodes array
    const nodes = appState.decisionTree.nodes || appState.decisionTree;
    
    // If sourceNodeId is provided, we're selecting from a node other than the current one
    const fromNodeId = sourceNodeId || appState.currentNodeId;
    
    // Check if we're changing paths by going back to a previous node
    if (sourceNodeId && appState.nodeHistory.includes(sourceNodeId)) {
        // Find the index of the source node in history
        const sourceIndex = appState.nodeHistory.indexOf(sourceNodeId);
        
        // Save the current path as a collapsed branch if it's not already from a previously selected option
        if (appState.selectedOptions[sourceNodeId] && 
            appState.selectedOptions[sourceNodeId] !== option.label) {
            
            // Create a branch key for this node and previous selection
            const branchKey = `${sourceNodeId}:${appState.selectedOptions[sourceNodeId]}`;
            
            // Store the collapsed branch information
            appState.collapsedBranches[branchKey] = {
                sourceNodeId: sourceNodeId,
                option: appState.selectedOptions[sourceNodeId],
                pathNodes: [...appState.pathNodes.filter(id => 
                    appState.nodeHistory.indexOf(id) > sourceIndex
                )],
                nodeHistory: [...appState.nodeHistory.slice(sourceIndex + 1)]
            };
        }
        
        // Truncate history to that point
        appState.nodeHistory = appState.nodeHistory.slice(0, sourceIndex + 1);
        
        // Also truncate the pathNodes to only include nodes up to the source node
        // This effectively collapses the previously generated forward path
        appState.pathNodes = appState.pathNodes.filter(nodeId => {
            // Keep nodes that are in the history up to the source node
            return appState.nodeHistory.indexOf(nodeId) <= sourceIndex;
        });
    }
    
    // Record which option was selected for this node
    appState.selectedOptions[fromNodeId] = option.label;
    
    // Update current node
    appState.currentNodeId = option.next;
    
    // Add to path nodes if not already there
    if (!appState.pathNodes.includes(option.next)) {
        appState.pathNodes.push(option.next);
    }
    
    // Add to node history
    appState.nodeHistory.push(option.next);
    
    // Update tree visualization
    renderTreeVisualization();
}

// Navigate to a specific previous node
function navigateToNode(nodeId) {
    if (nodeId === appState.currentNodeId) return; // Already at this node
    
    // Verify this node exists in our path
    if (!appState.pathNodes.includes(nodeId)) return;
    
    // Set this as the current node
    appState.currentNodeId = nodeId;
    
    // Update tree visualization
    renderTreeVisualization();
}

// Toggle a collapsed branch
function toggleCollapsedBranch(branchKey) {
    // Get the collapsed branch data
    const branch = appState.collapsedBranches[branchKey];
    if (!branch) return;
    
    // If the user is currently on the node that has the collapsed branch,
    // we need to switch to the collapsed branch path
    if (appState.currentNodeId === branch.sourceNodeId) {
        // First, save the current path as a new collapsed branch
        const currentOption = appState.selectedOptions[branch.sourceNodeId];
        const currentBranchKey = `${branch.sourceNodeId}:${currentOption}`;
        
        // Store the current branch
        appState.collapsedBranches[currentBranchKey] = {
            sourceNodeId: branch.sourceNodeId,
            option: currentOption,
            pathNodes: [...appState.pathNodes.filter(id => 
                appState.nodeHistory.indexOf(id) > appState.nodeHistory.indexOf(branch.sourceNodeId)
            )],
            nodeHistory: [...appState.nodeHistory.slice(appState.nodeHistory.indexOf(branch.sourceNodeId) + 1)]
        };
        
        // Now restore the collapsed branch
        appState.selectedOptions[branch.sourceNodeId] = branch.option;
        
        // Truncate history to the source node
        appState.nodeHistory = appState.nodeHistory.slice(
            0, appState.nodeHistory.indexOf(branch.sourceNodeId) + 1
        );
        
        // Append the collapsed branch history
        appState.nodeHistory = [...appState.nodeHistory, ...branch.nodeHistory];
        
        // Update path nodes - remove nodes after source and add the collapsed branch nodes
        appState.pathNodes = appState.pathNodes.filter(id => 
            appState.nodeHistory.indexOf(id) <= appState.nodeHistory.indexOf(branch.sourceNodeId)
        );
        appState.pathNodes = [...appState.pathNodes, ...branch.pathNodes];
        
        // Update current node to the last node in the restored branch
        appState.currentNodeId = branch.nodeHistory[branch.nodeHistory.length - 1] || branch.sourceNodeId;
        
        // Remove this branch from collapsed branches since it's now active
        delete appState.collapsedBranches[branchKey];
        
        // Update tree visualization
        renderTreeVisualization();
    }
    // If on a different node, just navigate to the branch source node
    else {
        navigateToNode(branch.sourceNodeId);
    }
}

// Restart exploration
function restartExploration() {
    initializeExploration();
}

// Export JSON
function exportJson() {
    if (!appState.decisionTree) {
        alert('No decision tree available to export');
        return;
    }
    try {
        const jsonString = JSON.stringify(appState.decisionTree, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'decision-tree.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        alert('Error exporting JSON: ' + error.message);
    }
}

// Show processing overlay
function showProcessingOverlay(message) {
    elements.processingStatus.textContent = message;
    elements.processingSubstatus.textContent = '';
    elements.processingOverlay.style.display = 'flex';
}

// Hide processing overlay
function hideProcessingOverlay() {
    elements.processingOverlay.style.display = 'none';
}

// Update processing status
function updateProcessingStatus(message) {
    elements.processingStatus.textContent = message;
}

// Render tree visualization to show the explored path and branching
function renderTreeVisualization() {
    if (!appState.decisionTree) return;
    
    const treeContainer = document.getElementById('tree-visualization');
    treeContainer.innerHTML = '';
    
    const nodes = appState.decisionTree.nodes || appState.decisionTree;
    const currentNodeId = appState.currentNodeId;
    
    // Function to create tree node element
    function createNodeElement(node, level = 0, isActive = true) {
        // Create node container
        const nodeEl = document.createElement('div');
        nodeEl.className = `tree-node ${node.id === currentNodeId ? 'current' : ''}`;
        nodeEl.dataset.nodeId = node.id;
        nodeEl.style.marginLeft = level > 0 ? `${level * 20}px` : '0';
        
        // Add node header with ID and type
        const titleEl = document.createElement('div');
        titleEl.className = 'tree-title';
        const titleText = document.createElement('span');
        titleText.textContent = `${node.id} (${node.type || 'Unknown'})`;
        titleText.className = 'fw-bold';
        
        // Make previous nodes clickable to navigate back
        if (node.id !== currentNodeId && appState.pathNodes.includes(node.id)) {
            titleText.style.cursor = 'pointer';
            titleText.style.textDecoration = 'underline';
            titleText.addEventListener('click', () => {
                navigateToNode(node.id);
            });
        }
        
        const badge = document.createElement('span');
        badge.className = `badge ${node.id === currentNodeId ? 'bg-success' : 'bg-primary'} tree-badge`;
        badge.textContent = node.id === currentNodeId ? 'Current' : 'Node';
        titleEl.appendChild(titleText);
        titleEl.appendChild(badge);
        nodeEl.appendChild(titleEl);
        
        // Add node content
        const contentEl = document.createElement('div');
        contentEl.textContent = node.question || node.text || '';
        contentEl.className = 'mt-1 mb-2';
        nodeEl.appendChild(contentEl);
        
        // Show selected option if this node has one
        const selectedOption = appState.selectedOptions[node.id];
        if (selectedOption) {
            const selectedEl = document.createElement('div');
            selectedEl.className = 'selected-option bg-light border-start border-success border-3 rounded px-2 py-1 mb-2';
            selectedEl.innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i> Selected: <strong>${selectedOption}</strong>`;
            
            // Check if this node has any collapsed branches
            Object.keys(appState.collapsedBranches).forEach(branchKey => {
                const [nodeId, option] = branchKey.split(':');
                if (nodeId === node.id && option === selectedOption) {
                    // Add a collapsible marker to this option
                    const collapseMarker = document.createElement('span');
                    collapseMarker.className = 'badge bg-secondary ms-2';
                    collapseMarker.innerHTML = '<i class="bi bi-arrows-expand"></i> Show branch';
                    collapseMarker.style.cursor = 'pointer';
                    collapseMarker.addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleCollapsedBranch(branchKey);
                    });
                    selectedEl.appendChild(collapseMarker);
                }
            });
            
            nodeEl.appendChild(selectedEl);
        }
        
        // Add options/next only if this is an active node
        if (isActive) {
            const hasOptions = (node.next && node.next.length > 0) || (node.options && node.options.length > 0);
            
            if (hasOptions) {
                // Add connector line
                const connectorEl = document.createElement('div');
                connectorEl.className = 'tree-connector';
                nodeEl.appendChild(connectorEl);
                
                // Add options container
                const optionsEl = document.createElement('div');
                optionsEl.className = 'tree-options';
                
                // Handle both schema types
                if (node.next && node.next.length > 0) {
                    node.next.forEach(option => {
                        const optionEl = document.createElement('div');
                        const isSelected = selectedOption === option.on;
                        optionEl.className = `tree-option ${isSelected ? 'selected' : ''}`;
                        
                        // Create arrow icon
                        const arrow = document.createElement('span');
                        arrow.className = `option-arrow ${isSelected ? 'text-success' : ''}`;
                        arrow.innerHTML = isSelected ? '✓' : '→';
                        
                        // Create option text
                        const optionText = document.createElement('span');
                        optionText.textContent = option.on;
                        optionText.className = isSelected ? 'fw-bold' : '';
                        
                        // Next node indicator
                        const nextNodeId = document.createElement('small');
                        nextNodeId.className = 'ms-1 text-muted';
                        nextNodeId.textContent = `(${option.id})`;
                        
                        // Check if this is a previously selected option with a collapsed branch
                        const branchKey = `${node.id}:${option.on}`;
                        if (appState.collapsedBranches[branchKey]) {
                            // Add collapsible marker
                            const collapseMarker = document.createElement('span');
                            collapseMarker.className = 'badge bg-secondary ms-2';
                            collapseMarker.innerHTML = '<i class="bi bi-arrows-expand"></i>';
                            collapseMarker.style.cursor = 'pointer';
                            collapseMarker.title = 'Show this branch';
                            collapseMarker.addEventListener('click', (e) => {
                                e.stopPropagation();
                                toggleCollapsedBranch(branchKey);
                            });
                            optionEl.appendChild(arrow);
                            optionEl.appendChild(optionText);
                            optionEl.appendChild(nextNodeId);
                            optionEl.appendChild(collapseMarker);
                        } else {
                            // Make option clickable to navigate
                            optionEl.style.cursor = 'pointer';
                            optionEl.addEventListener('click', () => {
                                selectOption({
                                    label: option.on,
                                    next: option.id
                                }, node.id);
                            });
                            
                            // Assemble option
                            optionEl.appendChild(arrow);
                            optionEl.appendChild(optionText);
                            optionEl.appendChild(nextNodeId);
                        }
                        
                        optionsEl.appendChild(optionEl);
                    });
                } else if (node.options && node.options.length > 0) {
                    node.options.forEach(option => {
                        const optionEl = document.createElement('div');
                        const isSelected = selectedOption === option.label;
                        optionEl.className = `tree-option ${isSelected ? 'selected' : ''}`;
                        
                        // Create arrow icon
                        const arrow = document.createElement('span');
                        arrow.className = `option-arrow ${isSelected ? 'text-success' : ''}`;
                        arrow.innerHTML = isSelected ? '✓' : '→';
                        
                        // Create option text
                        const optionText = document.createElement('span');
                        optionText.textContent = option.label;
                        optionText.className = isSelected ? 'fw-bold' : '';
                        
                        // Next node indicator
                        const nextNodeId = document.createElement('small');
                        nextNodeId.className = 'ms-1 text-muted';
                        nextNodeId.textContent = `(${option.next})`;
                        
                        // Check if this is a previously selected option with a collapsed branch
                        const branchKey = `${node.id}:${option.label}`;
                        if (appState.collapsedBranches[branchKey]) {
                            // Add collapsible marker
                            const collapseMarker = document.createElement('span');
                            collapseMarker.className = 'badge bg-secondary ms-2';
                            collapseMarker.innerHTML = '<i class="bi bi-arrows-expand"></i>';
                            collapseMarker.style.cursor = 'pointer';
                            collapseMarker.title = 'Show this branch';
                            collapseMarker.addEventListener('click', (e) => {
                                e.stopPropagation();
                                toggleCollapsedBranch(branchKey);
                            });
                            optionEl.appendChild(arrow);
                            optionEl.appendChild(optionText);
                            optionEl.appendChild(nextNodeId);
                            optionEl.appendChild(collapseMarker);
                        } else {
                            // Make option clickable to navigate
                            optionEl.style.cursor = 'pointer';
                            optionEl.addEventListener('click', () => {
                                selectOption({
                                    label: option.label,
                                    next: option.next
                                }, node.id);
                            });
                            
                            // Assemble option
                            optionEl.appendChild(arrow);
                            optionEl.appendChild(optionText);
                            optionEl.appendChild(nextNodeId);
                        }
                        
                        optionsEl.appendChild(optionEl);
                    });
                }
                
                nodeEl.appendChild(optionsEl);
            }
        }
        
        return nodeEl;
    }
    
    // Build the path for visualization
    const renderPath = [];
    
    // First, generate a list of nodes to render based on the current path and history
    appState.nodeHistory.forEach((nodeId, historyIndex) => {
        // Check if this node is still in the path (could have been removed by branching)
        if (appState.pathNodes.includes(nodeId)) {
            // Find the node data
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                // Determine the level (indentation) based on the position in the path
                const level = appState.pathNodes.indexOf(nodeId);
                
                // Determine if this node is still active in the current branch
                // A node is active if it's the current node or a predecessor of the current node
                const isActive = nodeId === currentNodeId || 
                    historyIndex <= appState.nodeHistory.indexOf(currentNodeId);
                
                renderPath.push({
                    node,
                    level,
                    isActive
                });
            }
        }
    });
    
    // Sort renderPath by levels to ensure proper order
    renderPath.sort((a, b) => a.level - b.level);
    
    // Render each node in the path
    renderPath.forEach(item => {
        treeContainer.appendChild(createNodeElement(item.node, item.level, item.isActive));
    });
    
    // Scroll to current node
    const currentNodeElement = treeContainer.querySelector(`.tree-node[data-node-id="${currentNodeId}"]`);
    if (currentNodeElement) {
        currentNodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Expand tree visualization
function expandTree() {
    appState.treeExpandedState = true;
    elements.treeVisualization.style.maxHeight = '600px';
    elements.treeVisualization.querySelectorAll('.tree-options').forEach(el => {
        el.style.display = 'block';
    });
}

// Collapse tree visualization
function collapseTree() {
    appState.treeExpandedState = false;
    elements.treeVisualization.style.maxHeight = '250px';
    elements.treeVisualization.querySelectorAll('.tree-options').forEach(el => {
        el.style.display = 'none';
    });
}

// Initialize the application
init();