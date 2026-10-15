"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const productRoutes_js_1 = __importDefault(require("./routes/productRoutes.js"));
const reviewRoutes_js_1 = __importDefault(require("./routes/reviewRoutes.js"));
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '32kb' }));
app.use('/products', productRoutes_js_1.default);
app.use('/api/reviews', reviewRoutes_js_1.default);
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found.' });
});
app.use((error, _req, res, _next) => {
    console.error('Request failed:', error);
    if (typeof error === 'object' &&
        error !== null &&
        'type' in error &&
        error.type === 'entity.parse.failed') {
        res.status(400).json({ error: 'Request body must contain valid JSON.' });
        return;
    }
    res.status(500).json({ error: 'Internal server error.' });
});
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
    console.log(`Products API listening on port ${port}`);
});
exports.default = app;
