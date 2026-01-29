const mongoose = require('mongoose');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const stream = require('stream');

class GridFSFileService {
    constructor() {
        this.bucket = null;
        this.initBucket();
    }

    initBucket() {
        // Wait for MongoDB connection to be ready
        if (mongoose.connection.readyState === 1) {
            this.bucket = new GridFSBucket(mongoose.connection.db, {
                bucketName: 'uploads'
            });
            console.log('✅ GridFS bucket initialized successfully');
        } else {
            mongoose.connection.once('open', () => {
                this.bucket = new GridFSBucket(mongoose.connection.db, {
                    bucketName: 'uploads'
                });
                console.log('✅ GridFS bucket initialized successfully');
            });
        }
    }

    /**
     * Get multer middleware for file uploads (stores in memory then to GridFS)
     * @param {string} category - File category (bills, documents, vehicle-images, etc.)
     * @returns {object} Multer middleware
     */
    getUploadMiddleware(category = 'documents') {
        const storage = multer.memoryStorage();

        return multer({
            storage: storage,
            limits: {
                fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB default
            },
            fileFilter: (req, file, cb) => {
                // Allow common file types
                const allowedMimes = [
                    'image/jpeg',
                    'image/jpg',
                    'image/png',
                    'image/gif',
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'text/csv',
                    'text/plain'
                ];

                if (allowedMimes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error(`File type ${file.mimetype} not allowed`), false);
                }
            }
        });
    }

    /**
     * Upload file to GridFS
     * @param {Buffer} fileBuffer - File buffer from multer
     * @param {object} fileMetadata - File metadata (filename, mimetype, etc.)
     * @param {string} category - File category
     * @returns {Promise<object>} Upload result with file ID and metadata
     */
    async uploadFile(fileBuffer, fileMetadata, category = 'documents') {
        return new Promise((resolve, reject) => {
            if (!this.bucket) {
                return reject(new Error('GridFS bucket not initialized'));
            }

            const { originalname, mimetype, size } = fileMetadata;
            const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${originalname}`;

            const uploadStream = this.bucket.openUploadStream(filename, {
                metadata: {
                    category: category,
                    originalname: originalname,
                    mimetype: mimetype,
                    size: size,
                    uploadedAt: new Date(),
                    uploadedBy: fileMetadata.uploadedBy || null
                }
            });

            const readableStream = new stream.Readable();
            readableStream.push(fileBuffer);
            readableStream.push(null);

            readableStream.pipe(uploadStream);

            uploadStream.on('error', (error) => {
                reject(error);
            });

            uploadStream.on('finish', () => {
                resolve({
                    success: true,
                    file: {
                        id: uploadStream.id,
                        filename: filename,
                        originalname: originalname,
                        mimetype: mimetype,
                        size: size,
                        category: category,
                        uploadedAt: new Date(),
                        url: `/api/files/download/${uploadStream.id}`
                    }
                });
            });
        });
    }

    /**
     * Download file from GridFS
     * @param {string} fileId - GridFS file ID
     * @returns {Promise<object>} Download stream and file metadata
     */
    async downloadFile(fileId) {
        return new Promise(async (resolve, reject) => {
            if (!this.bucket) {
                return reject(new Error('GridFS bucket not initialized'));
            }

            try {
                // Convert string ID to ObjectId
                const objectId = new mongoose.Types.ObjectId(fileId);

                // Get file metadata
                const files = await this.bucket.find({ _id: objectId }).toArray();
                
                if (!files || files.length === 0) {
                    return reject(new Error('File not found'));
                }

                const file = files[0];
                const downloadStream = this.bucket.openDownloadStream(objectId);

                resolve({
                    stream: downloadStream,
                    metadata: {
                        filename: file.filename,
                        mimetype: file.metadata?.mimetype || 'application/octet-stream',
                        size: file.length,
                        uploadedAt: file.uploadDate
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Delete file from GridFS
     * @param {string} fileId - GridFS file ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteFile(fileId) {
        return new Promise(async (resolve, reject) => {
            if (!this.bucket) {
                return reject(new Error('GridFS bucket not initialized'));
            }

            try {
                const objectId = new mongoose.Types.ObjectId(fileId);
                await this.bucket.delete(objectId);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * List files by category
     * @param {string} category - File category
     * @param {number} limit - Max number of files to return
     * @returns {Promise<Array>} List of files
     */
    async listFiles(category = null, limit = 50) {
        return new Promise(async (resolve, reject) => {
            if (!this.bucket) {
                return reject(new Error('GridFS bucket not initialized'));
            }

            try {
                const query = category ? { 'metadata.category': category } : {};
                const files = await this.bucket.find(query).limit(limit).toArray();

                const fileList = files.map(file => ({
                    id: file._id,
                    filename: file.filename,
                    originalname: file.metadata?.originalname || file.filename,
                    mimetype: file.metadata?.mimetype || 'application/octet-stream',
                    size: file.length,
                    category: file.metadata?.category || 'unknown',
                    uploadedAt: file.uploadDate,
                    uploadedBy: file.metadata?.uploadedBy || null,
                    url: `/api/files/download/${file._id}`
                }));

                resolve(fileList);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get file metadata
     * @param {string} fileId - GridFS file ID
     * @returns {Promise<object>} File metadata
     */
    async getFileMetadata(fileId) {
        return new Promise(async (resolve, reject) => {
            if (!this.bucket) {
                return reject(new Error('GridFS bucket not initialized'));
            }

            try {
                const objectId = new mongoose.Types.ObjectId(fileId);
                const files = await this.bucket.find({ _id: objectId }).toArray();

                if (!files || files.length === 0) {
                    return reject(new Error('File not found'));
                }

                const file = files[0];
                resolve({
                    id: file._id,
                    filename: file.filename,
                    originalname: file.metadata?.originalname || file.filename,
                    mimetype: file.metadata?.mimetype || 'application/octet-stream',
                    size: file.length,
                    category: file.metadata?.category || 'unknown',
                    uploadedAt: file.uploadDate,
                    uploadedBy: file.metadata?.uploadedBy || null
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Delete all files in a category
     * @param {string} category - File category
     * @returns {Promise<number>} Number of files deleted
     */
    async deleteFilesByCategory(category) {
        return new Promise(async (resolve, reject) => {
            if (!this.bucket) {
                return reject(new Error('GridFS bucket not initialized'));
            }

            try {
                const files = await this.bucket.find({ 'metadata.category': category }).toArray();
                let deletedCount = 0;

                for (const file of files) {
                    await this.bucket.delete(file._id);
                    deletedCount++;
                }

                resolve(deletedCount);
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = new GridFSFileService();
