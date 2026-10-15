"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const pg_1 = require("pg");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is required.');
}
const pool = new pg_1.Pool({ connectionString });
pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error);
});
exports.default = pool;
