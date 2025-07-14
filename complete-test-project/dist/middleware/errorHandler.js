"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const AppError_1 = require("../utils/AppError");
const errorHandler = (error, req, res, next) => {
    let statusCode = 500;
    let message = 'Internal server error';
    if (error instanceof AppError_1.AppError) {
        statusCode = error.statusCode;
        message = error.message;
    }
    const response = {
        success: false,
        message,
        error: error.name,
        statusCode
    };
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
        console.error('Error:', error);
    }
    res.status(statusCode).json(response);
};
exports.errorHandler = errorHandler;
exports.default = exports.errorHandler;
//# sourceMappingURL=errorHandler.js.map