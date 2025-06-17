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



const FileUpload = ({ onFilesSelect }) => {
    const [files, setFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (selectedFiles) => {
        const newFiles = Array.from(selectedFiles).map(file => ({
            id: Math.random().toString(36).substring(2),
            file,
        }));
        setFiles(prevFiles => [...prevFiles, ...newFiles]);
    };

    useEffect(() => {
        if(onFilesSelect) {
            onFilesSelect(files.map(f => f.file));
        }
    }, [files, onFilesSelect]);

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
    };

    

    const getFileIcon = (fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();
        if (['pdf'].includes(extension)) return 'pdf';
        if (['txt', 'text'].includes(extension)) return 'txt';
        if (['doc', 'docx'].includes(extension)) return 'doc';
        if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return 'img';
        return 'default';
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="file-uploader-container">
            
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
                                </div>
                                <div className="file-actions">
                                    <button onClick={() => handleCancelUpload(fileWrapper.id)} className="cancel-btn">
                                        <CancelIcon />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
