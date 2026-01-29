const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const gridFSFileService = require('../utils/gridFSFileService');

// @route   POST /api/files/upload
// @desc    Upload file to MongoDB GridFS
// @access  Private
router.post('/upload', auth, async (req, res) => {
    const upload = gridFSFileService.getUploadMiddleware('bills');
    
    upload.single('file')(req, res, async (err) => {
        if (err) {
            console.error('File upload error:', err);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        try {
            // Upload to GridFS
            const result = await gridFSFileService.uploadFile(
                req.file.buffer,
                {
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    uploadedBy: req.user.id
                },
                'bills'
            );

            res.json(result);
        } catch (error) {
            console.error('GridFS upload error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload file to database'
            });
        }
    });
});

// @route   POST /api/files/upload/vehicle-image
// @desc    Upload vehicle image to MongoDB GridFS
// @access  Private
router.post('/upload/vehicle-image', auth, async (req, res) => {
    const upload = gridFSFileService.getUploadMiddleware('vehicle-images');
    
    upload.single('image')(req, res, async (err) => {
        if (err) {
            console.error('Vehicle image upload error:', err);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image uploaded'
            });
        }

        try {
            const result = await gridFSFileService.uploadFile(
                req.file.buffer,
                {
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    uploadedBy: req.user.id
                },
                'vehicle-images'
            );

            res.json({
                success: true,
                image: result.file
            });
        } catch (error) {
            console.error('GridFS upload error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload image to database'
            });
        }
    });
});

// @route   POST /api/files/upload/document
// @desc    Upload document (receipt, invoice, etc.) to MongoDB GridFS
// @access  Private
router.post('/upload/document', auth, async (req, res) => {
    const upload = gridFSFileService.getUploadMiddleware('documents');
    
    upload.single('document')(req, res, async (err) => {
        if (err) {
            console.error('Document upload error:', err);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No document uploaded'
            });
        }

        try {
            const result = await gridFSFileService.uploadFile(
                req.file.buffer,
                {
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    uploadedBy: req.user.id
                },
                'documents'
            );

            res.json({
                success: true,
                document: result.file
            });
        } catch (error) {
            console.error('GridFS upload error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload document to database'
            });
        }
    });
});

// @route   GET /api/files/download/:fileId
// @desc    Download file from MongoDB GridFS
// @access  Private
router.get('/download/:fileId', auth, async (req, res) => {
    try {
        const { fileId } = req.params;
        
        const { stream, metadata } = await gridFSFileService.downloadFile(fileId);

        res.set({
            'Content-Type': metadata.mimetype,
            'Content-Disposition': `attachment; filename="${metadata.filename}"`,
            'Content-Length': metadata.size
        });

        stream.pipe(res);

    } catch (error) {
        console.error('File download error:', error);
        res.status(404).json({
            success: false,
            message: 'File not found'
        });
    }
});

// @route   DELETE /api/files/delete/:fileId
// @desc    Delete file from MongoDB GridFS
// @access  Private
router.delete('/delete/:fileId', auth, async (req, res) => {
    try {
        const { fileId } = req.params;
        
        await gridFSFileService.deleteFile(fileId);

        res.json({
            success: true,
            message: 'File deleted successfully'
        });

    } catch (error) {
        console.error('File deletion error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete file'
        });
    }
});

// @route   GET /api/files/list/:category?
// @desc    List files by category from MongoDB GridFS
// @access  Private
router.get('/list/:category?', auth, async (req, res) => {
    try {
        const { category } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        
        const files = await gridFSFileService.listFiles(category || null, limit);

        res.json({
            success: true,
            files: files,
            count: files.length
        });

    } catch (error) {
        console.error('File listing error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list files'
        });
    }
});

// @route   GET /api/files/info/:fileId
// @desc    Get file information from MongoDB GridFS
// @access  Private
router.get('/info/:fileId', auth, async (req, res) => {
    try {
        const { fileId } = req.params;
        
        const fileInfo = await gridFSFileService.getFileMetadata(fileId);

        res.json({
            success: true,
            file: fileInfo
        });

    } catch (error) {
        console.error('File info error:', error);
        res.status(404).json({
            success: false,
            message: 'File not found'
        });
    }
});

module.exports = router;