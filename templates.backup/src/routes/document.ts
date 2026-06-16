import { Router } from 'express';
import multer from 'multer';
import { documentController } from '../controllers/documentController';
import { auth } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types, but we can add restrictions here if needed
    cb(null, true);
  }
});

const imageUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for images
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files for profile uploads
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Document upload and management API
 */

// Upload profile image
router.post('/profile', auth, imageUpload.single('file'), documentController.uploadProfileImage);

// Upload document
router.post('/', auth, upload.single('file'), documentController.uploadDocument);

// Get user documents with pagination and filters
router.get('/', auth, documentController.getUserDocuments);

// Get document by ID
router.get('/:id', auth, documentController.getDocumentById);

// Download document
router.get('/:id/download', auth, documentController.downloadDocument);

// Update document metadata
router.put('/:id', auth, documentController.updateDocument);

// Delete document
router.delete('/:id', auth, documentController.deleteDocument);

export default router;