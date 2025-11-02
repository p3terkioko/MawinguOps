const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize SQLite database
const dbPath = path.join(__dirname, 'mawinguops.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[DB] Error opening database:', err.message);
    } else {
        console.log('[DB] Connected to SQLite database at:', dbPath);
        initializeDatabase();
    }
});

/**
 * Initialize database tables
 */
function initializeDatabase() {
    console.log('[DB] Initializing database tables...');
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
            console.error('[DB] Error enabling foreign keys:', err.message);
        }
    });
    
    // Create farmers table
    db.run(`
        CREATE TABLE IF NOT EXISTS farmers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone_number TEXT UNIQUE NOT NULL,
            location TEXT NOT NULL CHECK (location IN ('Vota', 'Kathiani', 'Mwala')),
            crop TEXT NOT NULL CHECK (crop IN ('Maize', 'Beans', 'Sorghum')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_advisory_at DATETIME
        )
    `, (err) => {
        if (err) {
            console.error('[DB] Error creating farmers table:', err.message);
        } else {
            console.log('[DB] Farmers table ready');
        }
    });

    // Create advisory_history table
    db.run(`
        CREATE TABLE IF NOT EXISTS advisory_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone_number TEXT NOT NULL,
            location TEXT NOT NULL,
            crop TEXT NOT NULL,
            advisory_text TEXT NOT NULL,
            recommendation TEXT NOT NULL CHECK (recommendation IN ('PLANT NOW', 'WAIT 2-3 DAYS', 'DO NOT PLANT YET')),
            weather_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('[DB] Error creating advisory_history table:', err.message);
        } else {
            console.log('[DB] Advisory history table ready');
        }
    });

    // Create indexes for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone_number)`, (err) => {
        if (err) console.error('[DB] Error creating farmers phone index:', err.message);
    });
    
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmers_location ON farmers(location)`, (err) => {
        if (err) console.error('[DB] Error creating farmers location index:', err.message);
    });
    
    db.run(`CREATE INDEX IF NOT EXISTS idx_advisory_phone ON advisory_history(phone_number)`, (err) => {
        if (err) console.error('[DB] Error creating advisory phone index:', err.message);
    });
    
    db.run(`CREATE INDEX IF NOT EXISTS idx_advisory_created ON advisory_history(created_at)`, (err) => {
        if (err) console.error('[DB] Error creating advisory created index:', err.message);
    });
}

/**
 * Farmer Management Functions
 */

/**
 * Register a new farmer
 * @param {string} phoneNumber - Phone number in format +254XXXXXXXXX
 * @param {string} location - One of: Vota, Kathiani, Mwala
 * @param {string} crop - One of: Maize, Beans, Sorghum
 * @returns {Promise<Object>} Result object with success status and farmer data
 */
function registerFarmer(phoneNumber, location, crop) {
    return new Promise((resolve, reject) => {
        // Validate phone number format
        if (!phoneNumber || !phoneNumber.match(/^\+254[0-9]{9}$/)) {
            resolve({
                success: false,
                error: 'Invalid phone number format. Use +254XXXXXXXXX'
            });
            return;
        }

        // Validate location
        if (!['Vota', 'Kathiani', 'Mwala'].includes(location)) {
            resolve({
                success: false,
                error: 'Invalid location. Must be one of: Vota, Kathiani, Mwala'
            });
            return;
        }

        // Validate crop
        if (!['Maize', 'Beans', 'Sorghum'].includes(crop)) {
            resolve({
                success: false,
                error: 'Invalid crop. Must be one of: Maize, Beans, Sorghum'
            });
            return;
        }

        const stmt = db.prepare(`
            INSERT INTO farmers (phone_number, location, crop)
            VALUES (?, ?, ?)
        `);

        stmt.run([phoneNumber, location, crop], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    resolve({
                        success: false,
                        error: 'Phone number already registered'
                    });
                } else {
                    console.error('[DB] Error registering farmer:', err);
                    resolve({
                        success: false,
                        error: 'Database error during registration'
                    });
                }
            } else {
                console.log(`[DB] Farmer registered: ${phoneNumber} - ${location} - ${crop}`);
                getFarmer(phoneNumber).then(result => {
                    if (result.success) {
                        resolve({
                            success: true,
                            farmer: result.farmer
                        });
                    } else {
                        resolve({
                            success: false,
                            error: 'Failed to retrieve registered farmer'
                        });
                    }
                });
            }
        });
        
        stmt.finalize();
    });
}

/**
 * Get farmer by phone number
 * @param {string} phoneNumber 
 * @returns {Promise<Object>} Result object with farmer data
 */
function getFarmer(phoneNumber) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM farmers WHERE phone_number = ?', [phoneNumber], (err, row) => {
            if (err) {
                console.error('[DB] Error getting farmer:', err);
                resolve({
                    success: false,
                    error: 'Database error'
                });
            } else if (row) {
                resolve({
                    success: true,
                    farmer: row
                });
            } else {
                resolve({
                    success: false,
                    error: 'Farmer not found'
                });
            }
        });
    });
}

/**
 * Get all farmers
 * @returns {Promise<Object>} Result object with farmers array
 */
function getAllFarmers() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM farmers ORDER BY created_at DESC', (err, rows) => {
            if (err) {
                console.error('[DB] Error getting all farmers:', err);
                resolve({
                    success: false,
                    error: 'Database error'
                });
            } else {
                resolve({
                    success: true,
                    count: rows.length,
                    farmers: rows
                });
            }
        });
    });
}

/**
 * Update farmer information
 * @param {string} phoneNumber 
 * @param {Object} updates - Object with fields to update
 * @returns {Promise<Object>} Result object
 */
function updateFarmer(phoneNumber, updates) {
    return new Promise((resolve, reject) => {
        const allowedFields = ['location', 'crop', 'last_advisory_at'];
        const updateFields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = ?`);
                values.push(value);
            }
        }
        
        if (updateFields.length === 0) {
            resolve({
                success: false,
                error: 'No valid fields to update'
            });
            return;
        }
        
        values.push(phoneNumber);
        
        const stmt = db.prepare(`
            UPDATE farmers 
            SET ${updateFields.join(', ')} 
            WHERE phone_number = ?
        `);
        
        stmt.run(values, function(err) {
            if (err) {
                console.error('[DB] Error updating farmer:', err);
                resolve({
                    success: false,
                    error: 'Database error'
                });
            } else if (this.changes > 0) {
                console.log(`[DB] Farmer updated: ${phoneNumber}`);
                resolve({
                    success: true,
                    message: 'Farmer updated successfully'
                });
            } else {
                resolve({
                    success: false,
                    error: 'Farmer not found'
                });
            }
        });
        
        stmt.finalize();
    });
}

/**
 * Delete farmer
 * @param {string} phoneNumber 
 * @returns {Promise<Object>} Result object
 */
function deleteFarmer(phoneNumber) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('DELETE FROM farmers WHERE phone_number = ?');
        
        stmt.run([phoneNumber], function(err) {
            if (err) {
                console.error('[DB] Error deleting farmer:', err);
                resolve({
                    success: false,
                    error: 'Database error'
                });
            } else if (this.changes > 0) {
                console.log(`[DB] Farmer deleted: ${phoneNumber}`);
                resolve({
                    success: true,
                    message: 'Farmer deleted successfully'
                });
            } else {
                resolve({
                    success: false,
                    error: 'Farmer not found'
                });
            }
        });
        
        stmt.finalize();
    });
}

/**
 * Get farmers by location
 * @param {string} location 
 * @returns {Promise<Object>} Result object with farmers array
 */
function getFarmersByLocation(location) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM farmers WHERE location = ? ORDER BY created_at DESC', [location], (err, rows) => {
            if (err) {
                console.error('[DB] Error getting farmers by location:', err);
                resolve({
                    success: false,
                    error: 'Database error'
                });
            } else {
                resolve({
                    success: true,
                    count: rows.length,
                    farmers: rows
                });
            }
        });
    });
}

/**
 * Advisory History Functions
 */

/**
 * Save advisory to history
 * @param {string} phoneNumber 
 * @param {string} location 
 * @param {string} crop 
 * @param {string} advisory 
 * @param {string} recommendation 
 * @param {Object} weatherData 
 * @returns {Promise<Object>} Result object
 */
function saveAdvisory(phoneNumber, location, crop, advisory, recommendation, weatherData) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
            INSERT INTO advisory_history 
            (phone_number, location, crop, advisory_text, recommendation, weather_data)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const weatherDataString = JSON.stringify(weatherData);
        
        stmt.run([phoneNumber, location, crop, advisory, recommendation, weatherDataString], function(err) {
            if (err) {
                console.error('[DB] Error saving advisory:', err);
                resolve({
                    success: false,
                    error: 'Database error'
                });
            } else {
                // Update farmer's last_advisory_at timestamp
                updateFarmer(phoneNumber, { last_advisory_at: new Date().toISOString() });
                
                console.log(`[DB] Advisory saved for: ${phoneNumber} - ${recommendation}`);
                resolve({
                    success: true,
                    advisoryId: this.lastID
                });
            }
        });
        
        stmt.finalize();
    });
}

/**
 * Get advisory history for a farmer
 * @param {string} phoneNumber 
 * @param {number} limit 
 * @returns {Promise<Object>} Result object with advisory history
 */
function getAdvisoryHistory(phoneNumber, limit = 10) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT * FROM advisory_history 
            WHERE phone_number = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        `, [phoneNumber, limit], (err, rows) => {
            if (err) {
                console.error('[DB] Error getting advisory history:', err);
                resolve({
                    success: false,
                    error: 'Database error'
                });
            } else {
                // Parse weather_data JSON strings
                rows.forEach(advisory => {
                    try {
                        advisory.weather_data = JSON.parse(advisory.weather_data);
                    } catch (e) {
                        advisory.weather_data = null;
                    }
                });
                
                resolve({
                    success: true,
                    count: rows.length,
                    advisories: rows
                });
            }
        });
    });
}

/**
 * Get all advisories (admin/testing)
 * @param {number} limit 
 * @returns {Promise<Object>} Result object with all advisories
 */
function getAllAdvisories(limit = 50) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT * FROM advisory_history 
            ORDER BY created_at DESC 
            LIMIT ?
        `, [limit], (err, rows) => {
            if (err) {
                console.error('[DB] Error getting all advisories:', err);
                resolve({
                    success: false,
                    error: 'Database error'
                });
            } else {
                // Parse weather_data JSON strings
                rows.forEach(advisory => {
                    try {
                        advisory.weather_data = JSON.parse(advisory.weather_data);
                    } catch (e) {
                        advisory.weather_data = null;
                    }
                });
                
                resolve({
                    success: true,
                    count: rows.length,
                    advisories: rows
                });
            }
        });
    });
}

/**
 * Close database connection
 */
function closeDatabase() {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                console.error('[DB] Error closing database:', err);
                reject(err);
            } else {
                console.log('[DB] Database connection closed');
                resolve();
            }
        });
    });
}

module.exports = {
    // Farmer functions
    registerFarmer,
    getFarmer,
    getAllFarmers,
    updateFarmer,
    deleteFarmer,
    getFarmersByLocation,
    
    // Advisory functions
    saveAdvisory,
    getAdvisoryHistory,
    getAllAdvisories,
    
    // Utility functions
    closeDatabase,
    initializeDatabase
};