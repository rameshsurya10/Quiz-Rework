import React, { useState, useCallback, useEffect } from 'react';
import './FileUpload.css';

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="drop-zone-icon">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
);

const CancelIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cancel-icon">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
);

const FileUpload = ({ onFilesSelect, onPageRangesChange }) => {
    const [files, setFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [pageRanges, setPageRanges] = useState({});
    const [fileErrors, setFileErrors] = useState({});
    const [showPageInfo, setShowPageInfo] = useState(false);
    const [expandedPageRanges, setExpandedPageRanges] = useState({});
    const [showSupportedFormats, setShowSupportedFormats] = useState(false);
    
    // Add file size limits
    const MAX_FILE_SIZE = 60 * 1024 * 1024; // 60MB in bytes
    const MAX_TOTAL_SIZE = 60 * 1024 * 1024; // 60MB in bytes

    const supportedFileTypes = [
        { type: 'PDF', extensions: ['.pdf'], icon: 'pdf' },
        { type: 'Documents', extensions: ['.doc', '.docx', '.txt', '.rtf', '.md'], icon: 'doc' },
        { type: 'Spreadsheets', extensions: ['.xls', '.xlsx', '.csv'], icon: 'excel' },
        { type: 'Images', extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'], icon: 'img' }
    ];

    const handleFileChange = (selectedFiles) => {
        // Check file size limits
        const newFilesArray = Array.from(selectedFiles);
        const oversizedFiles = newFilesArray.filter(file => file.size > MAX_FILE_SIZE);
        
        if (oversizedFiles.length > 0) {
            alert(`The following files exceed the maximum size limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB:\n${oversizedFiles.map(f => f.name).join('\n')}`);
            // Remove oversized files
            const validFiles = newFilesArray.filter(file => file.size <= MAX_FILE_SIZE);
            
            // Check total size
            const currentTotalSize = files.reduce((total, f) => total + f.file.size, 0);
            const newFilesSize = validFiles.reduce((total, f) => total + f.size, 0);
            
            if (currentTotalSize + newFilesSize > MAX_TOTAL_SIZE) {
                alert(`Total file size would exceed the maximum allowed (${MAX_TOTAL_SIZE / (1024 * 1024)}MB). Please remove some files.`);
                return;
            }
            
            // Add only valid files
            const newFiles = validFiles.map(file => ({
                id: Math.random().toString(36).substring(2),
                file,
            }));
            setFiles(prevFiles => [...prevFiles, ...newFiles]);
        } else {
            // Check total size
            const currentTotalSize = files.reduce((total, f) => total + f.file.size, 0);
            const newFilesSize = newFilesArray.reduce((total, f) => total + f.size, 0);
            
            if (currentTotalSize + newFilesSize > MAX_TOTAL_SIZE) {
                alert(`Total file size would exceed the maximum allowed (${MAX_TOTAL_SIZE / (1024 * 1024)}MB). Please remove some files.`);
                return;
            }
            
            // All files are valid
            const newFiles = newFilesArray.map(file => ({
                id: Math.random().toString(36).substring(2),
                file,
            }));
            setFiles(prevFiles => [...prevFiles, ...newFiles]);
        }
    };

    useEffect(() => {
        if(onFilesSelect) {
            onFilesSelect(files.map(f => f.file));
        }
    }, [files, onFilesSelect]);

    useEffect(() => {
        if(onPageRangesChange) {
            // Find the first PDF file's page ranges (for now we only support one PDF)
            const pdfFile = files.find(f => f.file.type === 'application/pdf' || f.file.name.toLowerCase().endsWith('.pdf'));
            const currentPageRanges = pdfFile && pageRanges[pdfFile.id] ? pageRanges[pdfFile.id] : "";
            
            // Only call onPageRangesChange if the value has actually changed
            onPageRangesChange(currentPageRanges);
        }
    }, [pageRanges, files]); // Remove onPageRangesChange from dependencies to prevent loop

    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    }, []);

    const handleBrowseClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = (e) => handleFileChange(e.target.files);
        input.click();
    };

    const handleCancelUpload = (id) => {
        setFiles(prevFiles => prevFiles.filter(f => f.id !== id));
        // Also clean up page ranges for this file
        if (pageRanges[id]) {
            const newPageRanges = {...pageRanges};
            delete newPageRanges[id];
            setPageRanges(newPageRanges);
        }
    };

    const handlePageRangeChange = (fileId, value) => {
        // Update the page ranges for this file
        setPageRanges(prev => ({
            ...prev,
            [fileId]: value
        }));

        // Validate the page range format
        let error = null;
        if (value) {
            const pattern = /^(\d+(-\d+)?)(,\d+(-\d+)?)*$/;
            if (!pattern.test(value)) {
                error = "Invalid format. Use format like '1-5,7,10-15'";
            } else {
                // Check that ranges are valid (start <= end)
                const rangeParts = value.split(',');
                for (const part of rangeParts) {
                    if (part.includes('-')) {
                        const [start, end] = part.split('-').map(Number);
                        if (start > end) {
                            error = `Invalid range: ${start}-${end}. Start must be <= end.`;
                            break;
                        }
                        if (start <= 0) {
                            error = "Page numbers must be positive";
                            break;
                        }
                    } else if (parseInt(part) <= 0) {
                        error = "Page numbers must be positive";
                        break;
                    }
                }
            }
        }

        // Update error state
        setFileErrors(prev => ({
            ...prev,
            [fileId]: error
        }));
        
        // Show the resolved page numbers (for verification)
        if (!error && value) {
            try {
                const expandedPages = [];
                const parts = value.split(',');
                
                for (const part of parts) {
                    if (part.includes('-')) {
                        const [start, end] = part.split('-').map(Number);
                        // Add all pages in the range
                        for (let i = start; i <= end; i++) {
                            expandedPages.push(i);
                        }
                    } else {
                        // Add the single page
                        expandedPages.push(parseInt(part));
                    }
                }
                
                // Sort the expanded pages for better readability
                expandedPages.sort((a, b) => a - b);
                
                // Store expanded pages for display
                setExpandedPageRanges(prev => ({
                    ...prev,
                    [fileId]: expandedPages
                }));
            } catch (e) {
                console.error("Error expanding page ranges:", e);
                setExpandedPageRanges(prev => ({
                    ...prev,
                    [fileId]: []
                }));
            }
        } else {
            // Clear expanded pages
            setExpandedPageRanges(prev => ({
                ...prev,
                [fileId]: []
            }));
        }
    };

    const getFileIcon = (fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();
        if (['pdf'].includes(extension)) return 'pdf';
        if (['txt', 'text', 'md', 'rtf'].includes(extension)) return 'txt';
        if (['doc', 'docx'].includes(extension)) return 'doc';
        if (['xls', 'xlsx', 'csv'].includes(extension)) return 'excel';
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'].includes(extension)) return 'img';
        return 'default';
    };

    const isPdfFile = (file) => {
        return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const togglePageInfo = (e) => {
        e.stopPropagation();
        setShowPageInfo(!showPageInfo);
    };

    const toggleSupportedFormats = (e) => {
        e.stopPropagation();
        setShowSupportedFormats(!showSupportedFormats);
    };

    return (
        <div className="file-uploader-container glass-effect">
            <div 
                className={`file-drop-zone ${isDragging ? 'drag-over' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleBrowseClick}
            >
                <input type="file" multiple style={{display: 'none'}} onChange={(e) => handleFileChange(e.target.files)} />
                <UploadIcon />
                <p className="drop-zone-text">Drag & Drop your files here</p>
                <p className="drop-zone-or">OR</p>
                <button type="button" className="browse-files-btn" onClick={(e) => {e.stopPropagation(); handleBrowseClick();}}>Browse Files</button>
                <p className="file-size-limit">Maximum file size: {MAX_FILE_SIZE / (1024 * 1024)}MB. Total limit: {MAX_TOTAL_SIZE / (1024 * 1024)}MB.</p>
                <div className="supported-formats">
                    <span className="supported-formats-link" onClick={toggleSupportedFormats}>
                        Supported formats <InfoIcon />
                    </span>
                    {showSupportedFormats && (
                        <div className="supported-formats-popup">
                            <h4>Supported File Types</h4>
                            <ul>
                                {supportedFileTypes.map((type, idx) => (
                                    <li key={idx}>
                                        <strong>{type.type}:</strong> {type.extensions.join(', ')}
                                    </li>
                                ))}
                            </ul>
                            <p className="formats-note">
                                <strong>Note:</strong> Page selection is only available for PDF files.
                                <br />
                                Text extraction quality may vary by file type.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {files.length > 0 && (
                <div className="uploaded-files-section">
                    <h3 className="uploaded-files-header">Uploaded files</h3>
                    <ul className="file-list">
                        {files.map(fileWrapper => (
                            <li key={fileWrapper.id} className="file-item">
                                <div className={`file-icon ${getFileIcon(fileWrapper.file.name)}`}>
                                    {fileWrapper.file.name.split('.').pop().toUpperCase().substring(0, 3)}
                                </div>
                                <div className="file-details">
                                    <p className="file-name">{fileWrapper.file.name}</p>
                                    <p className="file-size">{formatFileSize(fileWrapper.file.size)}</p>
                                    
                                    {/* Page range selector for PDF files */}
                                    {isPdfFile(fileWrapper.file) && (
                                        <div className="page-range-container">
                                            <div className="page-range-header">
                                                <label htmlFor={`page-range-${fileWrapper.id}`} className="page-range-label">
                                                    Select Pages (e.g., 1-5,7,10-15):
                                                </label>
                                                <span 
                                                    className="page-info-icon" 
                                                    onClick={togglePageInfo}
                                                >
                                                    <InfoIcon />
                                                </span>
                                            </div>
                                            
                                            {showPageInfo && (
                                                <div className="page-info-popup">
                                                    <h4>Page Selection Format</h4>
                                                    <p>Use the following format to select specific pages:</p>
                                                    <ul>
                                                        <li><strong>Single pages:</strong> 1,3,5</li>
                                                        <li><strong>Page ranges:</strong> 1-5,10-15</li>
                                                        <li><strong>Combination:</strong> 1-5,7,10-15</li>
                                                    </ul>
                                                    <p>Only questions from these pages will be generated.</p>
                                                    <p>Leave empty to use all pages.</p>
                                                </div>
                                            )}
                                            
                                            <input
                                                id={`page-range-${fileWrapper.id}`}
                                                type="text"
                                                className={`page-range-input ${fileErrors[fileWrapper.id] ? 'error' : ''}`}
                                                placeholder="Enter page numbers or ranges"
                                                value={pageRanges[fileWrapper.id] || ''}
                                                onChange={(e) => handlePageRangeChange(fileWrapper.id, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            
                                            {fileErrors[fileWrapper.id] && (
                                                <p className="page-range-error">{fileErrors[fileWrapper.id]}</p>
                                            )}
                                            
                                            {expandedPageRanges[fileWrapper.id] && expandedPageRanges[fileWrapper.id].length > 0 && (
                                                <div className="expanded-pages" onClick={(e) => e.stopPropagation()}>
                                                    <span className="expanded-pages-label">Selected pages:</span>
                                                    <div className="page-chips">
                                                        {expandedPageRanges[fileWrapper.id].length <= 20 ? (
                                                            expandedPageRanges[fileWrapper.id].map(page => (
                                                                <span key={page} className="page-chip">{page}</span>
                                                            ))
                                                        ) : (
                                                            <>
                                                                {expandedPageRanges[fileWrapper.id].slice(0, 10).map(page => (
                                                                    <span key={page} className="page-chip">{page}</span>
                                                                ))}
                                                                <span className="page-chip more-pages">
                                                                    +{expandedPageRanges[fileWrapper.id].length - 10} more
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button 
                                    type="button" 
                                    className="cancel-upload-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelUpload(fileWrapper.id);
                                    }}
                                >
                                    <CancelIcon />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
